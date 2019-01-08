pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";

import "../MusicRegistry.sol";

/**
 * @title Music Registry Smart Contract
 *
 * @dev Smart Contract that stores Compositions and Recordings metadata. Data stored is
 *      bassed on Open Music Initiative API.
 *
 * See https://omi01.docs.apiary.io/#reference/work-related-apis/works-collection/register-a-work
 *
 */
contract MusicRegistryPublic is MusicRegistry {
    function validateSignature(bytes32 hash, bytes signature, address signer)
        public
        returns (address)
    {
        return _validateSignature(hash, signature, signer);
    }

    function getWorkHash(MusicLib.Work memory metadata, string func, bytes data, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return metadata.getWorkHash(func, data, nonce);
    }

    function getWorkHash(MusicLib.Work memory metadata, string func, bytes32 workId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return metadata.getWorkHash(func, workId, nonce);
    }

    function getWorkHash(string func, bytes32 workId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return MusicLib.getWorkHash(func, workId, nonce);
    }

    function getRecordingHash(MusicLib.Recording memory metadata, string func, bytes data, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return metadata.getRecordingHash(func, data, nonce);
    }

    function getRecordingHash(MusicLib.Recording memory metadata, string func, bytes32 recordingId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return metadata.getRecordingHash(func, recordingId, nonce);
    }

    function getRecordingHash(string func, bytes32 recordingId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return MusicLib.getRecordingHash(func, recordingId, nonce);
    }
}
