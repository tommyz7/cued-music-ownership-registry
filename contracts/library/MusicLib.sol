pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";

library MusicLib {

    /**
     * For now, alternateTitles and alternate_TitleSoundRecording are strings storing
     * comma separated titles ie. "title1,title2,title3"
     */
    struct Work {
        string title;
        string titleSoundRecording;
        bytes32 iswc;
        bytes32 territory;
        address[] publishers;
        address ownershipContract;
    }

    /**
     * For new work
     */
    function getWorkHash(Work memory metadata, string func, bytes data, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                abi.encodePacked(
                    byte(0x19), byte(0), address(this),
                    func
                ),
                abi.encodePacked(
                    metadata.title,
                    metadata.titleSoundRecording,
                    metadata.iswc,
                    metadata.territory,
                    metadata.publishers,
                    data,
                    nonce
                )
            )
        );
    }

    /**
     * For current work
     */
    function getWorkHash(Work memory metadata, string func, bytes32 workId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                abi.encodePacked(
                    byte(0x19), byte(0), address(this),
                    func
                ),
                abi.encodePacked(
                    workId,
                    metadata.title,
                    metadata.titleSoundRecording,
                    metadata.iswc,
                    metadata.territory,
                    metadata.publishers,
                    nonce
                )
            )
        );
    }

    /**
     * For deleted work
     */
    function getWorkHash(string func, bytes32 workId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                byte(0x19), byte(0), address(this),
                func,
                workId,
                nonce
            )
        );
    }

    struct Recording {
        string title;
        string versionTitle;
        bytes32 isrc;
        bytes32 territory;
        bytes32 album_upc;
        address[] labels;
        bytes32[] workIds;
        address ownershipContract;
    }

    /**
     * For new recording
     */
    function getRecordingHash(Recording memory metadata, string func, bytes data, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                abi.encodePacked(
                    byte(0x19), byte(0), address(this),
                    func
                ),
                abi.encodePacked(
                    metadata.title,
                    metadata.versionTitle,
                    metadata.isrc,
                    metadata.territory,
                    metadata.album_upc
                ),
                abi.encodePacked(
                    metadata.labels,
                    metadata.workIds,
                    data,
                    nonce
                )
            )
        );
    }

    /**
     * For current recording
     */
    function getRecordingHash(Recording memory metadata, string func, bytes32 recordingId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                abi.encodePacked(
                    byte(0x19), byte(0), address(this),
                    func
                ),
                abi.encodePacked(
                    recordingId,
                    metadata.title,
                    metadata.versionTitle,
                    metadata.isrc,
                    metadata.territory
                ),
                abi.encodePacked(
                    metadata.album_upc,
                    metadata.labels,
                    metadata.workIds,
                    nonce
                )
            )
        );
    }

    /**
     * For deleted recording
     */
    function getRecordingHash(string func, bytes32 recordingId, uint256 nonce)
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                byte(0x19), byte(0), address(this),
                func,
                recordingId,
                nonce
            )
        );
    }

}
