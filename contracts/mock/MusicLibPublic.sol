pragma solidity >=0.5.0 <0.6.0;
pragma experimental "ABIEncoderV2";

import "../library/MusicLib.sol";

contract MusicLibPublic {
    using MusicLib for MusicLib.Work;
    using MusicLib for MusicLib.Recording;

    function getWorkHash(MusicLib.Work memory metadata, string memory func, bytes memory data, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return metadata.getWorkHash(func, data, nonce);
    }

    function getWorkHash(MusicLib.Work memory metadata, string memory func, bytes32 workId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return metadata.getWorkHash(func, workId, nonce);
    }

    function getWorkHash(string memory func, bytes32 workId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return MusicLib.getWorkHash(func, workId, nonce);
    }

    function getRecordingHash(MusicLib.Recording memory metadata, string memory func, bytes memory data, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return metadata.getRecordingHash(func, data, nonce);
    }

    function getRecordingHash(MusicLib.Recording memory metadata, string memory func, bytes32 recordingId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return metadata.getRecordingHash(func, recordingId, nonce);
    }

    function getRecordingHash(string memory func, bytes32 recordingId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return MusicLib.getRecordingHash(func, recordingId, nonce);
    }
}
