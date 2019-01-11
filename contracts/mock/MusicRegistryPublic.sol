pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";

import "../MusicRegistry.sol";

contract MusicRegistryPublic is MusicRegistry {
    function validateSignature(bytes32 hash, bytes signature, address signer)
        public
        returns (address)
    {
        return _validateSignature(hash, signature, signer);
    }
}
