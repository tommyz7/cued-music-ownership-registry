pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";

import '../EthereumDIDResolver.sol';

contract EthereumDIDResolverPublic is EthereumDIDResolver {
    function _setRegistry(address _ethDID) public {
        setRegistry(_ethDID);
    }
}
