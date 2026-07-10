/**
 * Hand-written OpenAPI 3.0 spec for this app's REST endpoints.
 *
 * Most of the app is Server Components + Server Actions (not REST — see
 * README/architecture notes), so there's nothing to document there; Swagger
 * only makes sense for endpoints an external caller (n8n, Postman, curl)
 * actually hits over HTTP. Those are:
 *   - POST /api/applicants/{id}/send-email   (Applicant Quick Actions → n8n)
 *   - POST /api/applicants/{id}/send-sms     (Applicant Quick Actions → n8n)
 *   - GET  /api/files/{path}                 (stored template/document downloads)
 *   - GET  /api/employees/export             (CSV export)
 *
 * Kept as a plain object (not scanned from JSDoc comments in the route files)
 * because there are only 4 routes — a build-time doc generator would be more
 * moving parts than value here. If the REST surface grows meaningfully,
 * revisit with `next-swagger-doc` to scan route handlers automatically.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "HR Recruitment System API",
    version: "1.0.0",
    description:
      "REST endpoints exposed by the HR platform for external callers (n8n webhooks, file downloads, exports). " +
      "Everything else in the app (Applicants, Interviews, Templates, Documents, Employees CRUD) runs through " +
      "Next.js Server Actions rather than REST, so it isn't listed here — there's no HTTP endpoint to call.",
  },
  servers: [{ url: "/", description: "Same origin as the app" }],
  tags: [
    { name: "Applicants", description: "Quick Actions that trigger n8n Cloud webhooks" },
    { name: "Files", description: "Serves uploaded templates and generated documents" },
    { name: "Employees", description: "Data export" },
  ],
  paths: {
    "/api/applicants/{id}/send-email": {
      post: {
        tags: ["Applicants"],
        summary: "Trigger the Send Email n8n workflow for an applicant",
        description:
          "Looks up the applicant, forwards their name/email/job title/status to the n8n Cloud webhook " +
          "configured in N8N_WEBHOOK_SEND_EMAIL, logs the action, and relays n8n's response back to the caller.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Applicant's MongoDB _id",
          },
        ],
        responses: {
          "200": {
            description: "Webhook triggered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { description: "Whatever n8n's webhook returned", nullable: true },
                  },
                },
              },
            },
          },
          "404": { description: "Applicant not found" },
          "502": { description: "n8n webhook unreachable, timed out, or not configured" },
        },
      },
    },
    "/api/applicants/{id}/send-sms": {
      post: {
        tags: ["Applicants"],
        summary: "Trigger the Send SMS n8n workflow for an applicant",
        description:
          "Same contract as send-email, but requires the applicant to have a phone number on file and posts " +
          "to N8N_WEBHOOK_SEND_SMS.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Applicant's MongoDB _id",
          },
        ],
        responses: {
          "200": { description: "Webhook triggered successfully" },
          "404": { description: "Applicant not found" },
          "422": { description: "Applicant has no phone number on file" },
          "502": { description: "n8n webhook unreachable, timed out, or not configured" },
        },
      },
    },
    "/api/files/{path}": {
      get: {
        tags: ["Files"],
        summary: "Download a stored template or generated document",
        description:
          "Streams a file from private local storage (never under /public). `path` is the storage key returned " +
          "in a template/document's `fileUrl` field, e.g. `templates/<uuid>.docx` or `documents/<uuid>.docx`.",
        parameters: [
          {
            name: "path",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Storage key, e.g. templates/3f9c1e2a-....docx",
          },
        ],
        responses: {
          "200": {
            description: "The file, with the correct Content-Type and Content-Disposition for download",
            content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } },
          },
          "404": { description: "File not found" },
        },
      },
    },
    "/api/employees/export": {
      get: {
        tags: ["Employees"],
        summary: "Export employees as CSV",
        description:
          "Exports every employee matching the given filters (same semantics as the Employees page) as a " +
          "downloadable CSV. Omit all query params to export everyone.",
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["active", "on_leave", "terminated"] },
          },
          { name: "department", in: "query", required: false, schema: { type: "string" } },
          {
            name: "search",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Matches name, email, employee code, or designation",
          },
        ],
        responses: {
          "200": {
            description: "CSV file",
            content: { "text/csv": { schema: { type: "string" } } },
          },
        },
      },
    },
  },
} as const;
