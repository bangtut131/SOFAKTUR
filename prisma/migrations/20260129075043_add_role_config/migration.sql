-- CreateTable
CREATE TABLE "RoleConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "visibleColumns" TEXT NOT NULL DEFAULT '[]',
    "canEditColumns" TEXT NOT NULL DEFAULT '[]'
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleConfig_role_key" ON "RoleConfig"("role");
