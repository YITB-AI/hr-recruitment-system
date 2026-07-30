import { Employee } from "@/models";
import { encryptSecret, decryptSecret, hashForUniqueness } from "@/lib/crypto";
import { escapeRegex } from "@/lib/regex";
import { getEmployeeMilestones } from "@/lib/employee-milestones";
import type { EmploymentStatus, EmploymentType, Gender } from "@/constants/employee";

// basicSalary/grossSalary are encrypted at rest (models/Employee.ts) —
// this pair of helpers is the ONLY place that boundary lives. Every other
// consumer (lib/salary-calculation.ts, document generation, the employee
// form, CSV import/export) continues sending/receiving plain numbers
// exactly as before; encrypt on the way in (create/update below), decrypt
// on the way out (serializeDetailRow/findAllForPicker below).
//
// decryptSalaryField tolerates a raw NUMBER, not just an encrypted string —
// a row written before scripts/migrate-encrypt-employee-salaries.ts ran
// still has the real BSON number from the old Number-typed schema, and
// reads must keep working correctly during that migration window.
function decryptSalaryField(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return 0;
  try {
    return Number(decryptSecret(raw));
  } catch {
    return Number(raw);
  }
}

function encryptSalaryField(value: number): string {
  return encryptSecret(String(value));
}

// The 7 new encrypted fields (4 recurring allowances + nationalIdNumber +
// eobiRegistrationNumber + socialSecurityNumber) are all optional and never
// existed as legacy plaintext — unlike decryptSalaryField above, no
// tolerate-a-raw-number fallback is needed. `null` (not 0/"") represents
// "not set", matching every other optional field's serialization elsewhere
// in this repository.
function decryptOptionalNumberField(raw: unknown): number | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return Number(decryptSecret(raw));
  } catch {
    return null;
  }
}

function decryptOptionalStringField(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return decryptSecret(raw);
  } catch {
    return null;
  }
}

function encryptOptionalField(value: number | string | undefined | null): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return encryptSecret(String(value));
}

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

/** A resolved {_id, name} lookup reference — the shape every new FK field below resolves to. */
export type EmployeeLookupRef = { _id: string; name: string } | null;

export type EmployeeDetailRow = EmployeeListRow & {
  employmentType: string;
  basicSalary: number;
  grossSalary: number;
  manager: { _id: string; name: string } | null;
  departmentId: string | null;
  employeeType: { _id: string; name: string } | null;
  createdAt: Date;

  // --- Employee Module Enhancement ---
  group: EmployeeLookupRef;
  region: EmployeeLookupRef;
  station: EmployeeLookupRef;
  costCenter: EmployeeLookupRef;
  vendor: EmployeeLookupRef;
  roleTemplate: EmployeeLookupRef;
  payrollSetup: EmployeeLookupRef;
  area: EmployeeLookupRef;
  subDepartment: EmployeeLookupRef;

  dateOfBirth: Date | null;
  gender: Gender | null;
  city: string | null;
  country: string | null;
  province: string | null;
  familyCode: string | null;

  nationalIdNumber: string | null;
  nationalIdExpiryDate: Date | null;
  passportExpiryDate: Date | null;
  eobiEntryDate: Date | null;
  eobiRegistrationNumber: string | null;
  socialSecurityNumber: string | null;
  punchCode: string | null;

  expectedProbationEndDate: Date | null;
  confirmationDate: Date | null;
  contractStartDate: Date | null;
  contractEndDate: Date | null;
  resignationDate: Date | null;
  leavingDate: Date | null;
  leavingReason: string | null;
  inactiveDate: Date | null;

  foodAllowance: number | null;
  transportAllowance: number | null;
  stipend: number | null;
  alcanzaAllowance: number | null;

  technicalNotes: string | null;

  // Derived, never stored — see the plan's "Derived, never stored" note.
  age: number | null;
  yearsOfService: number;
  isActive: boolean;
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

  // --- Employee Module Enhancement ---
  groupId?: string;
  regionId?: string;
  stationId?: string;
  costCenterId?: string;
  vendorId?: string;
  roleTemplateId?: string;
  payrollSetupId?: string;
  areaId?: string;
  subDepartmentId?: string;

  dateOfBirth?: Date;
  gender?: Gender;
  city?: string;
  country?: string;
  province?: string;
  familyCode?: string;

  nationalIdNumber?: string;
  nationalIdExpiryDate?: Date;
  passportExpiryDate?: Date;
  eobiEntryDate?: Date;
  eobiRegistrationNumber?: string;
  socialSecurityNumber?: string;
  punchCode?: string;

  // Left undefined to auto-default from joiningDate + 3mo (see create()) —
  // pass explicitly to override.
  expectedProbationEndDate?: Date;
  confirmationDate?: Date;
  contractStartDate?: Date;
  contractEndDate?: Date;
  resignationDate?: Date;
  leavingDate?: Date;
  leavingReason?: string;
  inactiveDate?: Date;

  foodAllowance?: number;
  transportAllowance?: number;
  stipend?: number;
  alcanzaAllowance?: number;

  technicalNotes?: string;
};

export type UpdateEmployeeInput = Partial<Omit<CreateEmployeeInput, "employeeCode">>;

type RawListRow = Record<string, unknown> & { _id: unknown };
type RawRef = { _id: unknown; name: string } | null;
type RawDetailRow = RawListRow & {
  managerId: RawRef;
  employeeTypeId: RawRef;
  groupId: RawRef;
  regionId: RawRef;
  stationId: RawRef;
  costCenterId: RawRef;
  vendorId: RawRef;
  roleTemplateId: RawRef;
  payrollSetupId: RawRef;
  areaId: RawRef;
  subDepartmentId: RawRef;
};

// Shared by findById/create/update below — every FK field on Employee that
// resolves to a {_id, name} reference, in one place so the 3 call sites
// can't drift from each other.
const POPULATE_PATHS = [
  { path: "managerId", select: "name" },
  { path: "employeeTypeId", select: "name" },
  { path: "groupId", select: "name" },
  { path: "regionId", select: "name" },
  { path: "stationId", select: "name" },
  { path: "costCenterId", select: "name" },
  { path: "vendorId", select: "name" },
  { path: "roleTemplateId", select: "name" },
  { path: "payrollSetupId", select: "name" },
  { path: "areaId", select: "name" },
  { path: "subDepartmentId", select: "name" },
];

function resolveRef(ref: RawRef): EmployeeLookupRef {
  return ref ? { _id: String(ref._id), name: ref.name } : null;
}

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

function ageFromDateOfBirth(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const hasNotHadBirthdayYet =
    now.getMonth() < dateOfBirth.getMonth() || (now.getMonth() === dateOfBirth.getMonth() && now.getDate() < dateOfBirth.getDate());
  if (hasNotHadBirthdayYet) age -= 1;
  return age;
}

function yearsOfServiceFromJoiningDate(joiningDate: Date): number {
  const now = new Date();
  let years = now.getFullYear() - joiningDate.getFullYear();
  const hasNotHadAnniversaryYet =
    now.getMonth() < joiningDate.getMonth() || (now.getMonth() === joiningDate.getMonth() && now.getDate() < joiningDate.getDate());
  if (hasNotHadAnniversaryYet) years -= 1;
  return Math.max(0, years);
}

function serializeDetailRow(row: RawDetailRow): EmployeeDetailRow {
  const dateOfBirth = (row.dateOfBirth as Date | undefined) ?? null;
  const joiningDate = row.joiningDate as Date;
  return {
    ...serializeListRow(row),
    employmentType: row.employmentType as string,
    basicSalary: decryptSalaryField(row.basicSalary),
    grossSalary: decryptSalaryField(row.grossSalary),
    manager: resolveRef(row.managerId),
    departmentId: row.departmentId ? String(row.departmentId) : null,
    employeeType: resolveRef(row.employeeTypeId),
    createdAt: row.createdAt as Date,

    group: resolveRef(row.groupId),
    region: resolveRef(row.regionId),
    station: resolveRef(row.stationId),
    costCenter: resolveRef(row.costCenterId),
    vendor: resolveRef(row.vendorId),
    roleTemplate: resolveRef(row.roleTemplateId),
    payrollSetup: resolveRef(row.payrollSetupId),
    area: resolveRef(row.areaId),
    subDepartment: resolveRef(row.subDepartmentId),

    dateOfBirth,
    gender: (row.gender as Gender | undefined) ?? null,
    city: (row.city as string | undefined) ?? null,
    country: (row.country as string | undefined) ?? null,
    province: (row.province as string | undefined) ?? null,
    familyCode: (row.familyCode as string | undefined) ?? null,

    nationalIdNumber: decryptOptionalStringField(row.nationalIdNumber),
    nationalIdExpiryDate: (row.nationalIdExpiryDate as Date | undefined) ?? null,
    passportExpiryDate: (row.passportExpiryDate as Date | undefined) ?? null,
    eobiEntryDate: (row.eobiEntryDate as Date | undefined) ?? null,
    eobiRegistrationNumber: decryptOptionalStringField(row.eobiRegistrationNumber),
    socialSecurityNumber: decryptOptionalStringField(row.socialSecurityNumber),
    punchCode: (row.punchCode as string | undefined) ?? null,

    expectedProbationEndDate: (row.expectedProbationEndDate as Date | undefined) ?? null,
    confirmationDate: (row.confirmationDate as Date | undefined) ?? null,
    contractStartDate: (row.contractStartDate as Date | undefined) ?? null,
    contractEndDate: (row.contractEndDate as Date | undefined) ?? null,
    resignationDate: (row.resignationDate as Date | undefined) ?? null,
    leavingDate: (row.leavingDate as Date | undefined) ?? null,
    leavingReason: (row.leavingReason as string | undefined) ?? null,
    inactiveDate: (row.inactiveDate as Date | undefined) ?? null,

    foodAllowance: decryptOptionalNumberField(row.foodAllowance),
    transportAllowance: decryptOptionalNumberField(row.transportAllowance),
    stipend: decryptOptionalNumberField(row.stipend),
    alcanzaAllowance: decryptOptionalNumberField(row.alcanzaAllowance),

    technicalNotes: (row.technicalNotes as string | undefined) ?? null,

    age: ageFromDateOfBirth(dateOfBirth),
    yearsOfService: yearsOfServiceFromJoiningDate(joiningDate),
    isActive: !TERMINAL_EMPLOYMENT_STATUSES.includes(row.employmentStatus as string),
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
      basicSalary: decryptSalaryField(row.basicSalary),
      grossSalary: decryptSalaryField(row.grossSalary),
      joiningDate: row.joiningDate as Date,
      employmentType: row.employmentType as string,
    }));
  },

  async findAll(companyId: string, filters: EmployeeListFilters): Promise<EmployeeListResult> {
    const query: Record<string, unknown> = { companyId };
    if (filters.status) query.employmentStatus = filters.status;
    if (filters.department) query.department = filters.department;
    if (filters.search) {
      const pattern = new RegExp(escapeRegex(filters.search.trim()), "i");
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
    const row = await Employee.findOne({ _id: id, companyId }).populate(POPULATE_PATHS).lean<RawDetailRow | null>();
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
    const milestones = getEmployeeMilestones(input.joiningDate, input.employmentType);
    const doc = await Employee.create({
      ...input,
      companyId,
      basicSalary: encryptSalaryField(input.basicSalary),
      grossSalary: encryptSalaryField(input.grossSalary),
      nationalIdNumber: encryptOptionalField(input.nationalIdNumber),
      nationalIdNumberHash: input.nationalIdNumber ? hashForUniqueness(input.nationalIdNumber) : undefined,
      eobiRegistrationNumber: encryptOptionalField(input.eobiRegistrationNumber),
      socialSecurityNumber: encryptOptionalField(input.socialSecurityNumber),
      foodAllowance: encryptOptionalField(input.foodAllowance),
      transportAllowance: encryptOptionalField(input.transportAllowance),
      stipend: encryptOptionalField(input.stipend),
      alcanzaAllowance: encryptOptionalField(input.alcanzaAllowance),
      // Defaulted from joiningDate + 3mo (reusing lib/employee-milestones.ts's
      // existing math, not reimplemented) whenever not explicitly provided —
      // still independently editable afterward via update() below.
      expectedProbationEndDate: input.expectedProbationEndDate ?? milestones.probationEndDate,
      confirmationDate: input.confirmationDate ?? milestones.confirmationDate,
    });
    const populated = await Employee.findById(doc._id).populate(POPULATE_PATHS).lean<RawDetailRow>();
    return serializeDetailRow(populated!);
  },

  async update(companyId: string, id: string, input: UpdateEmployeeInput): Promise<EmployeeDetailRow | null> {
    const patch: Record<string, unknown> = { ...input };

    if (input.basicSalary !== undefined) patch.basicSalary = encryptSalaryField(input.basicSalary);
    if (input.grossSalary !== undefined) patch.grossSalary = encryptSalaryField(input.grossSalary);

    // The 7 optional encrypted fields: encryptOptionalField returns
    // `undefined` when the caller is clearing the field (e.g. an empty
    // string) — but $set-ing a key to `undefined` is silently dropped by
    // the MongoDB driver (a no-op, not a clear), so those go through
    // $unset instead. Only touched when the caller actually included the
    // field in this partial update (`!== undefined` on the INPUT, not the
    // encrypted result).
    const unset: Record<string, ""> = {};
    const maybeEncrypt = (key: keyof UpdateEmployeeInput, targetField: string) => {
      if (input[key] === undefined) return;
      const encrypted = encryptOptionalField(input[key] as string | number);
      if (encrypted === undefined) unset[targetField] = "";
      else patch[targetField] = encrypted;
      delete patch[key];
    };
    maybeEncrypt("nationalIdNumber", "nationalIdNumber");
    maybeEncrypt("eobiRegistrationNumber", "eobiRegistrationNumber");
    maybeEncrypt("socialSecurityNumber", "socialSecurityNumber");
    maybeEncrypt("foodAllowance", "foodAllowance");
    maybeEncrypt("transportAllowance", "transportAllowance");
    maybeEncrypt("stipend", "stipend");
    maybeEncrypt("alcanzaAllowance", "alcanzaAllowance");
    if (input.nationalIdNumber !== undefined) {
      if (input.nationalIdNumber) patch.nationalIdNumberHash = hashForUniqueness(input.nationalIdNumber);
      else unset.nationalIdNumberHash = "";
    }

    const update = Object.keys(unset).length > 0 ? { $set: patch, $unset: unset } : patch;
    const row = await Employee.findOneAndUpdate({ _id: id, companyId }, update, { returnDocument: "after" })
      .populate(POPULATE_PATHS)
      .lean<RawDetailRow | null>();
    return row ? serializeDetailRow(row) : null;
  },

  async delete(companyId: string, id: string): Promise<void> {
    await Employee.findOneAndDelete({ _id: id, companyId });
  },

  // GLOBAL, not companyId-scoped — matches the schema's global unique index
  // on `email` (line 13 above). Used by bulk import's per-row duplicate
  // check before attempting a create that would otherwise fail with a
  // raw duplicate-key error.
  async existsByEmail(email: string): Promise<boolean> {
    const count = await Employee.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  },
  // For bulk import's optional "Manager Employee Code" column — the
  // referenced employee must already exist in the system before the
  // import runs (referencing another row within the same import file is
  // not supported).
  async findByCode(companyId: string, employeeCode: string): Promise<{ _id: string; name: string } | null> {
    const row = await Employee.findOne({ companyId, employeeCode }).select("name").lean<{ _id: unknown; name: string } | null>();
    return row ? { _id: String(row._id), name: row.name } : null;
  },
};
