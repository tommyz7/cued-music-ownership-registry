pragma solidity 0.4.24;

import "../SignatureValidator.sol";

/// @title SignatureValidator - recovers a sender from a signature
/// @author Ricardo Guilherme Schmidt (Status Research & Development GmbH)
/// @author Richard Meissner - <richard@gnosis.pm>
contract SignatureValidatorPublic is SignatureValidator{

    function getHash(string memory str) public view returns(bytes32) {
        return keccak256(abi.encodePacked(str));
    }
    /// @dev Recovers address who signed the message
    /// @param txHash operation ethereum signed message hash
    /// @param messageSignature message `txHash` signature
    /// @param pos which signature to read
    function _recoverKey (
        bytes32 txHash,
        bytes messageSignature,
        uint256 pos
    )
        pure
        public
        returns (address)
    {
        return super.recoverKey(txHash, messageSignature, pos);
    }

    /// @dev divides bytes signature into `uint8 v, bytes32 r, bytes32 s`
    /// @param pos which signature to read
    /// @param signatures concatenated rsv signatures
    function _signatureSplit(bytes signatures, uint256 pos)
        pure
        public
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        (v, r, s) = super.signatureSplit(signatures, pos);
    }
}
