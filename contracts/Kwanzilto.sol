// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Kwanzilto is ERC20, ERC20Burnable, Ownable {
    constructor(uint256 fornecimentoInicial)
        ERC20("Kwanzilto", "KWZ")
        Ownable(msg.sender)
    {
        _mint(msg.sender, fornecimentoInicial * 10 ** decimals());
    }

    // permite ao dono (quem fez o deploy) criar mais tokens depois
    function mint(address destinatario, uint256 quantidade) public onlyOwner {
        _mint(destinatario, quantidade * 10 ** decimals());
    }
}
