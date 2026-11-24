-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prescription_userId_idx" ON "Prescription"("userId");

-- CreateIndex
CREATE INDEX "IncidentLocation_userId_idx" ON "IncidentLocation"("userId");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentLocation" ADD CONSTRAINT "IncidentLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
