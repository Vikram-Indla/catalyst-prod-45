import { useState } from "react";
import { useParams } from "react-router-dom";
import { OKRHub as EnterpriseOKRHub } from "@/pages/enterprise/OKRHub";

export function OKRHub() {
  const { programId } = useParams();

  return <EnterpriseOKRHub scopeType="program" scopeId={programId} />;
}
