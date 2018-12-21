pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";


import "../OwnershipRoyaltiesAgreements.sol";


contract UpgradedOwnershipRoyaltiesAgreementsPublic is OwnershipRoyaltiesAgreements {

    function validateSignatures(
        string trasnferType,
        bytes32 templateHash,
        address senderSigner,
        address receiverSigner,
        uint256 value,
        bytes sigSenders,
        bytes sigReceivers,
        uint8 i
    ) public returns (address senderId, address receiverId) {
        (senderId, receiverId) = super._validateSignatures(trasnferType, templateHash, senderSigner, receiverSigner, value, sigSenders, sigReceivers, i);
    }

    function _transferOwnership(
        address from,
        address to,
        uint256 value
    ) public {
        super.transferOwnership(from, to, value);
    }

    function _transferRoyalties(
        address from,
        address to,
        uint256 value
    ) public {
        super.transferRoyalties(from, to, value);
    }

    // new function
    function getHashOfNumber(uint256 num) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(num));
    }
}