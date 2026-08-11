-- CreateIndex
CREATE INDEX "AuditLog_employeeId_at_idx" ON "AuditLog"("employeeId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_action_at_idx" ON "AuditLog"("action", "at");

-- CreateIndex
CREATE INDEX "AuditLog_branchId_at_idx" ON "AuditLog"("branchId", "at");
