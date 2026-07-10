import { Employee } from "@/models";
import type { EmploymentStatus, EmploymentType } from "@/constants/employee";

/**
 * Row shapes returned to the UI. Every ObjectId (including inside populated
 * sub-documents) is converted to a plain string before leaving this file —
 * React Server Components reject raw BSON ObjectId values when passed to a
 * Client Component, so this repository is the one place that boundary is
 * enforced for the Employee collection.
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
type RawDetailRow = RawListRow & { managerId: { _id: unknown; name: string } | null };

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
    createdAt: row.createdAt as Date,
  };
}

const LIST_FIELDS = "employeeCode name email phone department designation employmentStatus joiningDate";

export const employeeRepository = {
  /** Real HR staff picker — keeps the interview-scheduling/document-generation flows unaffected by this module's richer shapes. */
  async findAllForPicker(): Promise<EmployeeRow[]> {
    const rows = await Employee.find()
      .select("name email department designation basicSalary grossSalary")
      .lean<Array<Record<string, unknown> & { _id: unknown }>>();
    return rows.map((row) => ({
      _id: String(row._id),
      name: row.name as string,
      email: row.email as string,
      department: row.department as string,
      designation: row.designation as string,
      basicSalary: row.basicSalary as number,
      grossSalary: row.grossSalary as number,
    }));
  },

  async findAll(filters: EmployeeListFilters): Promise<EmployeeListResult> {
    const query: Record<string, unknown> = {};
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

  async findById(id: string): Promise<EmployeeDetailRow | null> {
    const row = await Employee.findById(id).populate("managerId", "name").lean<RawDetailRow | null>();
    return row ? serializeDetailRow(row) : null;
  },

  countTotal() {
    return Employee.countDocuments();
  },
  countByStatus(status: EmploymentStatus) {
    return Employee.countDocuments({ employmentStatus: status });
  },
  countCreatedBetween(start: Date, end: Date) {
    return Employee.countDocuments({ createdAt: { $gte: start, $lt: end } });
  },
  countByStatusUpdatedBetween(status: EmploymentStatus, start: Date, end: Date) {
    return Employee.countDocuments({ employmentStatus: status, updatedAt: { $gte: start, $lt: end } });
  },

  async listDepartments(): Promise<string[]> {
    const departments = await Employee.distinct("department");
    return (departments as string[]).sort();
  },

  /** Generates the next sequential display code (EMP-1001, EMP-1002, ...). Not safe against concurrent creates racing on the same count — acceptable for this app's single-admin usage pattern. */
  async nextEmployeeCode(): Promise<string> {
    const count = await Employee.countDocuments();
    return `EMP-${String(1001 + count)}`;
  },

  async create(input: CreateEmployeeInput): Promise<EmployeeDetailRow> {
    const doc = await Employee.create(input);
    const populated = await Employee.findById(doc._id).populate("managerId", "name").lean<RawDetailRow>();
    return serializeDetailRow(populated!);
  },

  async update(id: string, input: UpdateEmployeeInput): Promise<EmployeeDetailRow | null> {
    const row = await Employee.findByIdAndUpdate(id, input, { returnDocument: "after" })
      .populate("managerId", "name")
      .lean<RawDetailRow | null>();
    return row ? serializeDetailRow(row) : null;
  },

  async delete(id: string): Promise<void> {
    await Employee.findByIdAndDelete(id);
  },
};
