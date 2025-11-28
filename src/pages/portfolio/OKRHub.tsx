import { useState } from "react";
import { useParams } from "react-router-dom";
import { OKRHub as EnterpriseOKRHub } from "@/pages/enterprise/OKRHub";

export function OKRHub() {
  const { portfolioId } = useParams();

  return <EnterpriseOKRHub scopeType="portfolio" scopeId={portfolioId} />;
}
