pragma solidity ^0.4.24;

contract UUIDCounter {
    uint256 public counter = 1;
    mapping (bytes32 => bool) public usedUUIDs;

    event UUID(bytes32 uuid);

    function perpendFlag(bytes32 _uuid, uint8 _flag) internal pure returns (bytes32) {
        return _uuid | bytes32(byte(_flag));
    }
    /**
     * uint8 flag 87 for Work, 82 for Recording
     **/
    function newID(uint8 workRecordingFlag) internal returns (bytes32) {
        bytes32 uuid = bytes32(counter++);
        uuid = perpendFlag(uuid, workRecordingFlag);
        require(!usedUUIDs[uuid]);
        usedUUIDs[uuid] = true;
        emit UUID(uuid);
        return uuid;
    }

     // TODO: allow for packedIDs usage when you refactor code to not to use storage
    // bytes private internalID = new bytes(0);
    // function packID(bytes16 id) public view returns(bytes) {
    //     delete internalID;
    //     internalID.push(id[0]);
    //     uint8 zeros;
    //     while(id[zeros + 1] == byte(0)) {
    //         zeros++;
    //     }
    //     internalID.push(byte(zeros));
    //     for (uint8 i = zeros + 1; i < id.length; i++) {
    //         internalID.push(id[i]);
    //     }
    //     return internalID;
    // }

    // function unpackID(bytes id) public view returns (bytes) {
    //     // W0e01
    //     delete internalID;
    //     internalID.push(id[0]);
    //     uint8 zeros = uint8(id[1]);
    //     for (uint i = 0; i < zeros; i++) {
    //         internalID.push(byte(0));
    //     }
    //     for (i = 2; i < id.length; i++) {
    //         internalID.push(id[i]);
    //     }
    //     return internalID;
    // }
}
