-- Inscription avec validation par un administrateur.
-- Ajouts de colonnes uniquement (pas de reconstruction de la table User) : aucune suppression en cascade possible.
ALTER TABLE "User" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "User" ADD COLUMN "requestedMatricule" TEXT;
ALTER TABLE "User" ADD COLUMN "reviewNote" TEXT;
CREATE INDEX "User_approvalStatus_idx" ON "User"("approvalStatus");
