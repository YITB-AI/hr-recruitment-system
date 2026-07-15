/**
 * Hand-written OpenAPI 3.0 spec for this app's REST endpoints.
 *
 * Most of the app is Server Components + Server Actions (not REST — see
 * README/architecture notes), so there's nothing to document there; Swagger
 * only makes sense for endpoints an external caller (n8n, Postman, curl)
 * actually hits over HTTP. Those are:
 *   - POST /api/applicants/{id}/send-email   (Applicant Quick Actions → n8n)
 *   - POST /api/applicants/{id}/send-sms     (Applicant Quick Actions → n8n)
 *   - POST /api/webhooks/ai-call             (n8n → app: AI call progress/outcome)
 *   - GET  /api/files/{path}                 (stored template/document downloads)
 *   - GET  /api/employees/export             (CSV export)
 *
 * Kept as a plain object (not scanned from JSDoc comments in the route files)
 * because there are only 5 routes — a build-time doc generator would be more
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
    { name: "Webhooks", description: "Inbound callbacks from n8n" },
    { name: "Files", description: "Serves uploaded templates and generated documents" },
    { name: "Employees", description: "Data export" },
  ],
  components: {
    securitySchemes: {
      callbackSecret: {
        type: "apiKey",
        in: "header",
        name: "X-Callback-Secret",
        description: "Shared secret configured via N8N_WEBHOOK_CALLBACK_SECRET, compared with a constant-time check.",
      },
    },
  },
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
    "/api/webhooks/ai-call": {
      post: {
        tags: ["Webhooks"],
        summary: "Report AI call progress/outcome back to the app",
        description:
          "Called by n8n's AI Call workflow — never by this app. followupId and applicantId are the values " +
          "originally sent to n8n in the outbound ai-call webhook trigger; the request is rejected if they " +
          "don't both resolve to the same ApplicantFollowup row (tenant identity is always taken from that " +
          "row, never trusted from the body). A duplicate or out-of-order event for an already-terminal row " +
          "(completed/failed) is accepted as a no-op, not an error.",
        security: [{ callbackSecret: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  {
                    type: "object",
                    required: ["event", "followupId", "applicantId"],
                    properties: {
                      event: { type: "string", enum: ["started"] },
                      followupId: { type: "string" },
                      applicantId: { type: "string" },
                    },
                  },
                  {
                    type: "object",
                    required: ["event", "followupId", "applicantId", "outcome"],
                    properties: {
                      event: { type: "string", enum: ["completed"] },
                      followupId: { type: "string" },
                      applicantId: { type: "string" },
                      outcome: {
                        type: "string",
                        enum: [
                          "interview_scheduled",
                          "reschedule_requested",
                          "callback_requested",
                          "not_interested",
                          "withdrawn",
                          "rejected",
                          "accepted",
                          "no_answer",
                          "voicemail",
                          "other",
                        ],
                      },
                      transcript: { type: "string" },
                      summary: { type: "string" },
                      recordingUrl: { type: "string", format: "uri" },
                      proposedInterviewAt: { type: "string", format: "date-time" },
                      notes: { type: "string" },
                    },
                  },
                  {
                    type: "object",
                    required: ["event", "followupId", "applicantId"],
                    properties: {
                      event: { type: "string", enum: ["failed"] },
                      followupId: { type: "string" },
                      applicantId: { type: "string" },
                      error: { type: "string" },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          "200": { description: "Accepted (including duplicate/out-of-order no-ops)" },
          "400": { description: "Malformed JSON body" },
          "401": { description: "Missing or incorrect X-Callback-Secret" },
          "404": { description: "followupId doesn't resolve to any ApplicantFollowup row" },
          "413": { description: "Body too large" },
          "422": { description: "Body failed schema validation, or applicantId doesn't match the followupId row" },
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
