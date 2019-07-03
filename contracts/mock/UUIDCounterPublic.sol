pragma solidity >=0.5.0 <0.6.0;

import "../UUIDCounter.sol";

contract UUIDCounterPublic is UUIDCounter {
    function perpendFlagPublic(bytes32 _uuid, uint8 _flag) public pure returns (bytes32) {
        perpendFlag(_uuid, _flag);
    }
    /**
     * uint8 flag 87 for Work, 82 for Recording
     **/
    function newIDPublic(uint8 workRecordingFlag) public returns (bytes32) {
        newID(workRecordingFlag);
    }
}
