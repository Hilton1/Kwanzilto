// Confere, direto na Sepolia, que o Kwanzilto foi implantado corretamente.
// Só faz leituras: não precisa de chave privada nem de ETH.
//
// Uso: npx tsx scripts/verificar-sepolia.ts
//   ou node --experimental-strip-types scripts/verificar-sepolia.ts
// Opcional: SEPOLIA_RPC_URL=<sua url> para usar outro nó em vez do público.

import { readFileSync } from "node:fs";
import { Contract, JsonRpcProvider, formatUnits } from "ethers";

const RPC_URL =
  process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

const enderecos = JSON.parse(
  readFileSync(
    new URL(
      "../ignition/deployments/chain-11155111/deployed_addresses.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const ENDERECO: string = enderecos["KwanziltoModule#Kwanzilto"];

const ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function owner() view returns (address)",
  "function balanceOf(address) view returns (uint256)",
];

const provider = new JsonRpcProvider(RPC_URL);
const token = new Contract(ENDERECO, ABI, provider);

let falhas = 0;
function conferir(descricao: string, ok: boolean, detalhe: string) {
  console.log(`${ok ? "✔" : "✘"} ${descricao}: ${detalhe}`);
  if (!ok) falhas++;
}

const rede = await provider.getNetwork();
conferir("Rede", rede.chainId === 11155111n, `chain ID ${rede.chainId} (Sepolia)`);

const codigo = await provider.getCode(ENDERECO);
conferir(
  "Contrato existe",
  codigo !== "0x",
  `${ENDERECO} (${(codigo.length - 2) / 2} bytes de bytecode)`,
);

const [nome, simbolo, decimais, total, dono] = await Promise.all([
  token.name(),
  token.symbol(),
  token.decimals(),
  token.totalSupply(),
  token.owner(),
]);
const saldoDono = await token.balanceOf(dono);

conferir("Nome", nome === "Kwanzilto", nome);
conferir("Símbolo", simbolo === "KWZ", simbolo);
conferir("Decimais", decimais === 18n, decimais.toString());
conferir(
  "Fornecimento total",
  total === 10_000_000n * 10n ** 18n,
  `${formatUnits(total, decimais)} ${simbolo}`,
);
conferir("Dono", true, dono);
conferir(
  "Saldo do dono",
  saldoDono <= total,
  `${formatUnits(saldoDono, decimais)} ${simbolo}`,
);

// O Ignition guarda o hash da transação de deploy no journal.
const journal = readFileSync(
  new URL("../ignition/deployments/chain-11155111/journal.jsonl", import.meta.url),
  "utf8",
);
const hashDeploy = journal.match(/"hash":"(0x[0-9a-f]{64})"/)?.[1];
if (hashDeploy) {
  // Nós públicos às vezes não devolvem recibos antigos; tenta algumas vezes.
  let recibo = null;
  for (let tentativa = 0; tentativa < 4 && !recibo; tentativa++) {
    if (tentativa > 0) await new Promise((r) => setTimeout(r, 1500));
    recibo = await provider.getTransactionReceipt(hashDeploy);
  }
  if (!recibo) {
    console.log(
      `! Transação de deploy: o nó não devolveu o recibo agora; confira em https://sepolia.etherscan.io/tx/${hashDeploy}`,
    );
  } else conferir(
    "Transação de deploy",
    recibo?.status === 1 &&
      recibo.contractAddress?.toLowerCase() === ENDERECO.toLowerCase(),
    `${hashDeploy} (bloco ${recibo?.blockNumber}, enviada por ${recibo?.from})`,
  );
}

console.log(`\nEtherscan: https://sepolia.etherscan.io/address/${ENDERECO}`);
console.log(falhas === 0 ? "\nTudo certo." : `\n${falhas} verificação(ões) falharam.`);
process.exitCode = falhas === 0 ? 0 : 1;
