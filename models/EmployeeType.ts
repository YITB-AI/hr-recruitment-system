import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// New position/role-level master (e.g. Developer, Team Lead, Manager) with a
// self-referencing reporting hierarchy — same self-reference pattern as
// Employee.managerId. Purely structural/informational for now: it does not
// drive or constrain Employee.managerId selection (see the plan). Separate
// from and additive to the existing Employee.employmentType enum
// (Full-Time/Part-Time/Contract/Internship), which is untouched.
const employeeTypeSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
    name: { type: String, required: true, trim: true },
    parentTypeId: { type: Schema.Types.ObjectId, ref: "EmployeeType" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, required: true, default: 0 },
    deletedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

employeeTypeSchema.index({ companyId: 1, name: 1 }, { unique: true });
employeeTypeSchema.index({ companyId: 1, order: 1 });

export type EmployeeTypeDoc = InferSchemaType<typeof employeeTypeSchema>;

export const EmployeeType: Model<EmployeeTypeDoc> =
  models.EmployeeType ?? model<EmployeeTypeDoc>("EmployeeType", employeeTypeSchema);
