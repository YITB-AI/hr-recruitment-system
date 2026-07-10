import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { EMPLOYMENT_STATUSES, EMPLOYMENT_TYPES } from "@/constants/employee";

export { EMPLOYMENT_STATUSES };

const employeeSchema = new Schema(
  {
    // Human-friendly display id shown in the UI (e.g. "EMP-1001"), distinct
    // from Mongo's _id. Assigned once at creation, never reused.
    employeeCode: { type: String, required: true, unique: true },
    applicantId: { type: Schema.Types.ObjectId, ref: "Applicant" },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    managerId: { type: Schema.Types.ObjectId, ref: "Employee" },
    joiningDate: { type: Date, required: true },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: "full_time" },
    employmentStatus: { type: String, enum: EMPLOYMENT_STATUSES, default: "active", index: true },
    basicSalary: { type: Number, required: true },
    grossSalary: { type: Number, required: true },
  },
  { timestamps: true },
);

employeeSchema.index({ department: 1 });
employeeSchema.index({ name: "text", email: "text", employeeCode: "text" });

export type EmployeeDoc = InferSchemaType<typeof employeeSchema>;

export const Employee: Model<EmployeeDoc> =
  models.Employee ?? model<EmployeeDoc>("Employee", employeeSchema);
