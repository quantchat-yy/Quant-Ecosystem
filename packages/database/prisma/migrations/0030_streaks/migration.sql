-- CreateTable: Snapchat-style messaging streaks between two users (canonical
-- order userAId < userBId). count increments at most once per 24h window when
-- both users have messaged each other within the last 24h; it breaks when the
-- mutual exchange lapses past expiresAt.
CREATE TABLE "streaks" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastFromA" TIMESTAMP(3),
    "lastFromB" TIMESTAMP(3),
    "lastIncrementAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "streaks_userAId_userBId_key" ON "streaks"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "streaks_expiresAt_idx" ON "streaks"("expiresAt");
