import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { EMPLOYMENT_TYPES, GENDER_OPTIONS } from "@/constants/employee";

const employeeSchema = new Schema(
  {
    // Required since the Employee/SavedView tenant-scoping fix — every row
    // was already backfilled by scripts/migrate-tenancy.ts long ago and
    // every write path has supplied it since. The old global-unique `email`
    // index below is now the compound `{companyId, email}` unique index
    // (see the bottom of this schema): the same email can legitimately
    // belong to an employee at two different client companies.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    // Human-friendly display id shown in the UI (e.g. "EMP-1001"), distinct
    // from Mongo's _id. Assigned once at creation, never reused.
    employeeCode: { type: String, required: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant" },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    // Free-string legacy field, kept in sync with departmentId's resolved
    // name by employee.service.ts on every create/update so every existing
    // read path (filters, document variables, CSV export) keeps working
    // unchanged even for employees created before the Department master
    // existed. Never written directly from user input anymore.
    department: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },
    designation: { type: String, required: true, trim: true },
    // Purely additive — a new position/role-level master (see
    // models/EmployeeType.ts), separate from and independent of
    // employmentType below. Optional: existing employees have none, and
    // this doesn't gate managerId selection (structural/informational only,
    // per the plan).
    employeeTypeId: { type: Schema.Types.ObjectId, ref: "EmployeeType", index: true },
    managerId: { type: Schema.Types.ObjectId, ref: "Employee" },
    joiningDate: { type: Date, required: true },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: "full_time" },
    // No schema-level enum — see the matching comment on models/Applicant.ts.
    employmentStatus: { type: String, default: "active", index: true },
    // Encrypted at rest (see server/repositories/employee.repository.ts's
    // encryptSalaryField/decryptSalaryField) — SECURITY_STANDARDS.md's
    // "encryption for sensitive fields... salaries" mandate. Stored as a
    // String (ciphertext), not Number, going forward — a pre-migration row
    // written under the old Number-typed schema keeps its real BSON number
    // until scripts/migrate-encrypt-employee-salaries.ts re-encrypts it in
    // place; decryptSalaryField tolerates both shapes.
    basicSalary: { type: String, required: true },
    grossSalary: { type: String, required: true },

    // --- Employee Module Enhancement (~50-field request) ---
    // FK fields into the 8 registry-driven lookup lists — see
    // constants/employee-lookup.ts for the model/kind/permission registry
    // these all share.
    groupId: { type: Schema.Types.ObjectId, ref: "Group", index: true },
    regionId: { type: Schema.Types.ObjectId, ref: "Region", index: true },
    stationId: { type: Schema.Types.ObjectId, ref: "Station", index: true },
    costCenterId: { type: Schema.Types.ObjectId, ref: "CostCenter", index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", index: true },
    roleTemplateId: { type: Schema.Types.ObjectId, ref: "RoleTemplate", index: true },
    payrollSetupId: { type: Schema.Types.ObjectId, ref: "PayrollSetup", index: true },
    areaId: { type: Schema.Types.ObjectId, ref: "Area", index: true },
    // "Sub Department" — a second, independent FK into the SAME Department
    // collection (not a separate hierarchy/collection — see Phase 1's plan
    // note on why parentDepartmentId was dropped as unnecessary complexity).
    subDepartmentId: { type: Schema.Types.ObjectId, ref: "Department", index: true },

    // Personal information
    dateOfBirth: { type: Date },
    gender: { type: String, enum: GENDER_OPTIONS },
    city: { type: String, trim: true },
    // Fixed, universal list (constants/country.ts) — not a per-company
    // configurable lookup, unlike Group/Region/etc. above.
    country: { type: String, trim: true },
    province: { type: String, trim: true },
    familyCode: { type: String, trim: true },

    // National ID / government identifiers. nationalIdNumber covers both
    // CNIC (Pakistan) and Emirates ID (UAE) as one field — encrypted at rest
    // (same mechanism as basicSalary/grossSalary), with a deterministic
    // sidecar hash (lib/crypto.ts's hashForUniqueness) enforcing real
    // per-company uniqueness on the PLAINTEXT value, since AES-GCM's random
    // IV means the ciphertext itself is never the same twice and can't back
    // a unique index. eobiRegistrationNumber/socialSecurityNumber are
    // encrypted the same way but without a uniqueness constraint (lower
    // real-world need — avoids overengineering every ID field uniformly).
    nationalIdNumber: { type: String },
    nationalIdNumberHash: { type: String },
    nationalIdExpiryDate: { type: Date },
    passportExpiryDate: { type: Date },
    eobiEntryDate: { type: Date },
    eobiRegistrationNumber: { type: String },
    socialSecurityNumber: { type: String },
    punchCode: { type: String, trim: true },

    // Lifecycle dates. expectedProbationEndDate/confirmationDate default to
    // joiningDate + 3 months at creation time (server/repositories/
    // employee.repository.ts reuses lib/employee-milestones.ts's existing
    // getEmployeeMilestones math for this default — not reimplemented) but
    // stay independently editable afterward, since a company may need to
    // extend/shorten an individual employee's probation.
    expectedProbationEndDate: { type: Date },
    confirmationDate: { type: Date },
    contractStartDate: { type: Date },
    contractEndDate: { type: Date },
    resignationDate: { type: Date },
    leavingDate: { type: Date },
    leavingReason: { type: String, trim: true },
    inactiveDate: { type: Date },

    // Payroll — encrypted the same way as basicSalary/grossSalary above.
    // "Monthly Salary" from the request IS basicSalary (relabeled in the
    // UI only, per the confirmed decision) — not a new field.
    foodAllowance: { type: String },
    transportAllowance: { type: String },
    stipend: { type: String },
    alcanzaAllowance: { type: String },

    technicalNotes: { type: String },
  },
  { timestamps: true },
);

employeeSchema.index({ department: 1 });
employeeSchema.index({ name: "text", email: "text", employeeCode: "text" });
// employeeCode is unique per-company, not globally — a bare unique index on
// the field alone would let a fresh company's first "EMP-1001" collide with
// another company's existing one (nextEmployeeCode's sequence starts over
// per company).
employeeSchema.index({ companyId: 1, employeeCode: 1 }, { unique: true });
// email is unique per-company, not globally — the same person's email can
// legitimately belong to an employee at two different client companies
// (mirrors the identical fix already applied to User.email). Applying this
// to a live database also requires scripts/migrate-employee-email-index.ts's
// own separate --confirm run (Mongoose's autoIndex never drops an existing
// live index, only adds new ones).
employeeSchema.index({ companyId: 1, email: 1 }, { unique: true });
// A partial index, NOT sparse — for a COMPOUND index, `sparse` only
// excludes a document that is missing ALL indexed fields; since companyId
// is always present, a plain sparse index here would still index every
// employee lacking nationalIdNumberHash as an explicit `null`, and any two
// such employees at the same company would collide as a "duplicate null".
// partialFilterExpression correctly excludes any document where
// nationalIdNumberHash doesn't exist, regardless of companyId.
employeeSchema.index(
  { companyId: 1, nationalIdNumberHash: 1 },
  { unique: true, partialFilterExpression: { nationalIdNumberHash: { $exists: true } } },
);

export type EmployeeDoc = InferSchemaType<typeof employeeSchema>;

export const Employee: Model<EmployeeDoc> =
  models.Employee ?? model<EmployeeDoc>("Employee", employeeSchema);
