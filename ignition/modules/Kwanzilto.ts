import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("KwanziltoModule", (m) => {
  const fornecimentoInicial = m.getParameter("fornecimentoInicial", 10_000_000n);
  const kwanzilto = m.contract("Kwanzilto", [fornecimentoInicial]);
  return { kwanzilto };
});
