-- CreateTable
CREATE TABLE "SoSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalValue" REAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "SoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "transNo" TEXT NOT NULL,
    "transDate" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "outstanding" REAL NOT NULL,
    "primeOwing" REAL NOT NULL,
    "scannedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "notes" TEXT,
    CONSTRAINT "SoItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SoSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SoItem_sessionId_idx" ON "SoItem"("sessionId");

-- CreateIndex
CREATE INDEX "SoItem_transNo_idx" ON "SoItem"("transNo");
