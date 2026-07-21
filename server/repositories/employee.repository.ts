import { Employee } from "@/models";
import type { EmploymentStatus, EmploymentType } from "@/constants/employee";

/**
 * Row shapes returned to the UI. Every ObjectId (including inside populated
 * sub-documents) is converted to a plain string before leaving this file —
 * React Server Components reject raw BSON ObjectId values when passed to a
 * Client Component, so this repository is the one place that boundary is
 * enforced for the Employee collection.
 *
 * Every function takes `companyId` as its first argument and filters by it —
 * this is the tenant-isolation mechanism for Phase 1 (see the plan's
 * "Tenant Isolation Mechanism" section): explicit, reviewable in every diff,
 * and works the same inside scripts (no request context) as inside services.
 */
export type EmployeeListRow = {
  _id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  department: string;
  designation: string;
  employmentStatus: EmploymentStatus;
  joiningDate: Date;
};

export type EmployeeDetailRow = EmployeeListRow & {
  employmentType: string;
  basicSalary: number;
  grossSalary: number;
  manager: { _id: string; name: string } | null;
  departmentId: string | null;
  employeeType: { _id: string; name: string } | null;
  createdAt: Date;
};

/** Minimal shape used by pickers (document generation, interviewer lists, etc). */
export type EmployeeRow = {
  _id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  basicSalary: number;
  grossSalary: number;
  // Needed so the document-generation wizard's client-side preview can
  // compute the same milestone dates generateOne() resolves server-side —
  // see lib/employee-milestones.ts.
  joiningDate: Date;
  employmentType: string;
};

export type EmployeeListFilters = {
  status?: EmploymentStatus;
  department?: string;
  search?: string;
  page: number;
  pageSize: number;
};

export type EmployeeListResult = {
  rows: EmployeeListRow[];
  total: number;
};

export type CreateEmployeeInput = {
  employeeCode: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  departmentId?: string;
  employeeTypeId?: string;
  designation: string;
  managerId?: string;
  joiningDate: Date;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  basicSalary: number;
  grossSalary: number;
  applicantId?: string;
};

export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, "employeeCode">>;

type RawListRow = Record<string, unknown> & { _id: unknown };
type RawDetailRow = RawListRow & {
  managerId: { _id: unknown; name: string } | null;
  employeeTypeId: { _id: unknown; name: string } | null;
};

function serializeListRow(row: RawListRow): EmployeeListRow {
  return {
    _id: String(row._id),
    employeeCode: row.employeeCode as string,
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string | undefined) ?? null,
    department: row.department as string,
    designation: row.designation as string,
    employmentStatus: row.employmentStatus as EmploymentStatus,
    joiningDate: row.joiningDate as Date,
  };
}

function serializeDetailRow(row: RawDetailRow): EmployeeDetailRow {
  return {
    ...serializeListRow(row),
    employmentType: row.employmentType as string,
    basicSalary: row.basicSalary as number,
    grossSalary: row.grossSalary as number,
    manager: row.managerId ? { _id: String(row.managerId._id), name: row.managerId.name } : null,
    departmentId: row.departmentId ? String(row.departmentId) : null,
    employeeType: row.employeeTypeId ? { _id: String(row.employeeTypeId._id), name: row.employeeTypeId.name } : null,
    createdAt: row.createdAt as Date,
  };
}

const LIST_FIELDS = "employeeCode name email phone department designation employmentStatus joiningDate";

// The default seed statuses that represent an employee no longer working
// here — see constants/employee.ts. employmentStatus is a free-form
// per-company custom string (via the Status collection), with no built-in
// "is this a terminal/still-employed state" flag, so this denylist is a
// known limitation: a company that renamed/removed these default keys
// won't be filtered correctly. Denylisting (vs. allowlisting "active")
// deliberately still includes "probation"/"on_leave"/"notice_period" —
// exactly who's likely to have an imminent milestone.
const TERMINAL_EMPLOYMENT_STATUSES = ["resigned", "terminated", "inactive"];

export type EmployeeMilestoneRow = {
  _id: string;
  name: string;
  department: string;
  designation: string;
  joiningDate: Date;
  employmentType: string;
};

export const employeeRepository = {
  /** For the dashboard's "Upcoming Employee Actions" widget — see lib/employee-milestones.ts. */
  async findActiveForMilestones(companyId: string): Promise<EmployeeMilestoneRow[]> {
    const rows = await Employee.find({ companyId, employmentStatus: { $nin: TERMINAL_EMPLOYMENT_STATUSES } })
      .select("name department designation joiningDate employmentType")
      .lean<Array<Record<string, unknown> & { _id: unknown }>>();
    return rows.map((row) => ({
      _id: String(row._id),
      name: row.name as string,
      department: row.department as string,
      designation: row.designation as string,
      joiningDate: row.joiningDate as Date,
      employmentType: row.employmentType as string,
    }));
  },
  /** Real HR staff picker — keeps the interview-scheduling/document-generation flows unaffected by this module's richer shapes. */
  async findAllForPicker(companyId: string): Promise<EmployeeRow[]> {
    const rows = await Employee.find({ companyId })
      .select("name email department designation basicSalary grossSalary joiningDate employmentType")
      .limit(1000)
      .lean<Array<Record<string, unknown> & { _id: unknown }>>();
    return rows.map((row) => ({
      _id: String(row._id),
      name: row.name as string,
      email: row.email as string,
      department: row.department as string,
      designation: row.designation as string,
      basicSalary: row.basicSalary as number,
      grossSalary: row.grossSalary as number,
      joiningDate: row.joiningDate as Date,
      employmentType: row.employmentType as string,
    }));
  },

  async findAll(companyId: string, filters: EmployeeListFilters): Promise<EmployeeListResult> {
    const query: Record<string, unknown> = { companyId };
    if (filters.status) query.employmentStatus = filters.status;
    if (filters.department) query.department = filters.department;
    if (filters.search) {
      const pattern = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ name: pattern }, { email: pattern }, { employeeCode: pattern }, { designation: pattern }];
    }

    const [rows, total] = await Promise.all([
      Employee.find(query)
        .select(LIST_FIELDS)
        .sort({ createdAt: -1 })
        .skip((filters.page - 1) * filters.pageSize)
        .limit(filters.pageSize)
        .lean<RawListRow[]>(),
      Employee.countDocuments(query),
    ]);

    return { rows: rows.map(serializeListRow), total };
  },

  // Scoped by companyId in the query itself (not just id) — an id from
  // another company must resolve to "not found", never leak the document
  // (the IDOR case: guessing/enumerating another tenant's employee id).
  async findById(companyId: string, id: string): Promise<EmployeeDetailRow | null> {
    const row = await Employee.findOne({ _id: id, companyId }).populate("managerId", "name").populate("employeeTypeId", "name").lean<RawDetailRow | null>();
    return row ? serializeDetailRow(row) : null;
  },

  countTotal(companyId: string) {
    return Employee.countDocuments({ companyId });
  },
  countByStatus(companyId: string, status: EmploymentStatus) {
    return Employee.countDocuments({ companyId, employmentStatus: status });
  },
  countCreatedBetween(companyId: string, start: Date, end: Date) {
    return Employee.countDocuments({ companyId, createdAt: { $gte: start, $lt: end } });
  },
  countByStatusUpdatedBetween(companyId: string, status: EmploymentStatus, start: Date, end: Date) {
    return Employee.countDocuments({ companyId, employmentStatus: status, updatedAt: { $gte: start, $lt: end } });
  },

  async listDepartments(companyId: string): Promise<string[]> {
    const departments = await Employee.distinct("department", { companyId });
    return (departments as string[]).sort();
  },

  /**
   * Generates the next sequential display code (EMP-1001, EMP-1002, ...),
   * scoped per company so each company's codes start from EMP-1001 —
   * `employeeCode`'s uniqueness is enforced by a compound
   * `{companyId, employeeCode}` index (models/Employee.ts), not a bare
   * global one, so two different companies can both have an "EMP-1001".
   * Not safe against concurrent creates racing on the same count —
   * acceptable for this app's single-admin-per-company usage pattern; a
   * genuine race now fails loudly with a duplicate-key error rather than
   * silently succeeding, since the index still enforces uniqueness within
   * a company.
   */
  async nextEmployeeCode(companyId: string): Promise<string> {
    const count = await Employee.countDocuments({ companyId });
    return `EMP-${String(1001 + count)}`;
  },

  async create(companyId: string, input: CreateEmployeeInput): Promise<EmployeeDetailRow> {
    const doc = await Employee.create({ ...input, companyId });
    const populated = await Employee.findById(doc._id).populate("managerId", "name").populate("employeeTypeId", "name").lean<RawDetailRow>();
    return serializeDetailRow(populated!);
  },

  async update(companyId: string, id: string, input: UpdateEmployeeInput): Promise<EmployeeDetailRow | null> {
    const row = await Employee.findOneAndUpdate({ _id: id, companyId }, input, { returnDocument: "after" })
      .populate("managerId", "name").populate("employeeTypeId", "name")
      .lean<RawDetailRow | null>();
    return row ? serializeDetailRow(row) : null;
  },

  async delete(companyId: string, id: string): Promise<void> {
    await Employee.findOneAndDelete({ _id: id, companyId });
  },
};
