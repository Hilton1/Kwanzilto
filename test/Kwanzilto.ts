import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

const FORNECIMENTO_INICIAL = 10_000_000n;
const UM_TOKEN = 10n ** 18n;

describe("Kwanzilto", function () {
  async function implantarFixture() {
    const [dono, outraConta] = await ethers.getSigners();
    const token = await ethers.deployContract("Kwanzilto", [
      FORNECIMENTO_INICIAL,
    ]);
    return { token, dono, outraConta };
  }

  it("tem o nome, o símbolo e as casas decimais corretos", async function () {
    const { token } = await networkHelpers.loadFixture(implantarFixture);
    expect(await token.name()).to.equal("Kwanzilto");
    expect(await token.symbol()).to.equal("KWZ");
    expect(await token.decimals()).to.equal(18n);
  });

  it("credita todo o fornecimento inicial ao dono", async function () {
    const { token, dono } = await networkHelpers.loadFixture(implantarFixture);
    const saldoDono = await token.balanceOf(dono.address);
    expect(saldoDono).to.equal(FORNECIMENTO_INICIAL * UM_TOKEN);
    expect(await token.totalSupply()).to.equal(saldoDono);
  });

  it("define quem fez o deploy como dono", async function () {
    const { token, dono } = await networkHelpers.loadFixture(implantarFixture);
    expect(await token.owner()).to.equal(dono.address);
  });

  it("permite transferir tokens entre contas", async function () {
    const { token, dono, outraConta } =
      await networkHelpers.loadFixture(implantarFixture);
    await expect(token.transfer(outraConta.address, 100n))
      .to.emit(token, "Transfer")
      .withArgs(dono.address, outraConta.address, 100n);
    expect(await token.balanceOf(outraConta.address)).to.equal(100n);
  });

  it("impede transferir mais do que o saldo", async function () {
    const { token, outraConta } =
      await networkHelpers.loadFixture(implantarFixture);
    await expect(
      token.connect(outraConta).transfer(outraConta.address, 1n),
    ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
  });

  it("permite ao dono fazer mint em unidades inteiras", async function () {
    const { token, outraConta } =
      await networkHelpers.loadFixture(implantarFixture);
    await token.mint(outraConta.address, 500n);
    expect(await token.balanceOf(outraConta.address)).to.equal(500n * UM_TOKEN);
    expect(await token.totalSupply()).to.equal(
      (FORNECIMENTO_INICIAL + 500n) * UM_TOKEN,
    );
  });

  it("impede que outra conta faça mint", async function () {
    const { token, outraConta } =
      await networkHelpers.loadFixture(implantarFixture);
    await expect(token.connect(outraConta).mint(outraConta.address, 100n))
      .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
      .withArgs(outraConta.address);
  });

  it("permite queimar os próprios tokens (burn)", async function () {
    const { token, dono } = await networkHelpers.loadFixture(implantarFixture);
    await token.burn(1_000n * UM_TOKEN);
    expect(await token.balanceOf(dono.address)).to.equal(
      (FORNECIMENTO_INICIAL - 1_000n) * UM_TOKEN,
    );
    expect(await token.totalSupply()).to.equal(
      (FORNECIMENTO_INICIAL - 1_000n) * UM_TOKEN,
    );
  });

  it("permite gastar tokens de terceiros via approve + transferFrom", async function () {
    const { token, dono, outraConta } =
      await networkHelpers.loadFixture(implantarFixture);
    await expect(token.approve(outraConta.address, 300n))
      .to.emit(token, "Approval")
      .withArgs(dono.address, outraConta.address, 300n);
    await token
      .connect(outraConta)
      .transferFrom(dono.address, outraConta.address, 300n);
    expect(await token.balanceOf(outraConta.address)).to.equal(300n);
    expect(await token.allowance(dono.address, outraConta.address)).to.equal(0n);
  });
});
