pragma solidity >=0.5.0 <0.6.0;
pragma experimental "ABIEncoderV2";

import "../MusicRegistry.sol";

contract MusicRegistryPublic is MusicRegistry {
    function validateSignature(bytes32 hash, bytes memory signature, address signer)
        public
        returns (address)
    {
        return _validateSignature(hash, signature, signer);
    }
}
