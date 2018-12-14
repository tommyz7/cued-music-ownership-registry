pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";

import './interface/EthereumDIDRegistryInterface.sol';

contract EthereumDIDResolver {
    address public ethDIDReg;

    event EthRegistrySet(address reg);

    function setRegistry(address _ethDID) internal {
        ethDIDReg = _ethDID;
        emit EthRegistrySet(_ethDID);
    }

    function isIdentityOwner(address identity, address actor) public view returns (bool) {
        return EthereumDIDRegistryInterface(ethDIDReg).isIdentityOwner(identity, actor);
    }

    function getIdentity(address actor) public view returns (address) {
        address id = EthereumDIDRegistryInterface(ethDIDReg).getIdentity(actor);
        require(id != address(0), '0x0 Identity is not allowed to perform any action');
        return id;
    }
}
