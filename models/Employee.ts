import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { EMPLOYMENT_TYPES } from "@/constants/employee";

const employeeSchema = new Schema(
  {
    // Optional for now — see the companyId comment in models/User.ts.
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    // Human-friendly display id shown in the UI (e.g. "EMP-1001"), distinct
    // from Mongo's _id. Assigned once at creation, never reused.
    employeeCode: { type: String, required: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant" },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
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
    basicSalary: { type: Number, required: true },
    grossSalary: { type: Number, required: true },
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

export type EmployeeDoc = InferSchemaType<typeof employeeSchema>;

export const Employee: Model<EmployeeDoc> =
  models.Employee ?? model<EmployeeDoc>("Employee", employeeSchema);
