pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";


contract FileRegistry {

    // enum FileType { Other, Agreement, Sheets, Notes, Stem, Track, Demo, FinalMix }

    struct File {
        uint8 fileType;
        string ipfsHash;
    }

    // QmahqCsAUAw7zMv6P6Ae8PjCTck7taQA6FgGQLnWdKG7U8

    // workId/recordingId => keccak256(abi.encodePacked(IPFS) hash) => File
    mapping(bytes16 => mapping(bytes32 => File)) public files;
    // workId/recordingId => FileType => keccak256(abi.encodePacked(IPFS) hashes)
    mapping(bytes16 => mapping(uint8 => bytes32[])) public typeIndexes;

    event NewFile (
        bytes16 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType);

    event UpdateFile (
        bytes16 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType);

    event DeleteFile (bytes16 indexed projectId, string indexed hash);

    function getFiles(bytes16 projectId, uint8 fileType) public view returns (File[]) {
        bytes32[] storage _fileHashes = typeIndexes[projectId][fileType];
        File[] memory result = new File[](_fileHashes.length);
        for (uint256 i = 0; i < _fileHashes.length; i++) {
            result[i] = files[projectId][_fileHashes[i]];
        }
        return result;
    }

    function getFileType(bytes16 projectId, string ipfsHash) public view returns (uint8) {
        return files[projectId][keccak256(abi.encodePacked(ipfsHash))].fileType;
    }

    function isProjectFile(bytes16 projectId, string ipfsHash) public view returns (bool) {
        return bytes(files[projectId][keccak256(abi.encodePacked(ipfsHash))].ipfsHash).length > 0;
    }

    function getIndexes(bytes16 projectId, uint8 fileType) public view returns (bytes32[]) {
        return typeIndexes[projectId][fileType];
    }

    function _addFile(
        bytes16 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType
    ) internal {
        require(projectId != bytes16(0), 'Must have projectId');
        require(uint8(fileType) > 0, "FileType must be correct value");
        require(bytes(ipfsHash).length > 0,
            'Must have non-zero IPFS hash');

        files[projectId][keccak256(abi.encodePacked(ipfsHash))] = File(fileType, ipfsHash);
        typeIndexes[projectId][fileType].push(keccak256(abi.encodePacked(ipfsHash)));

        emit NewFile(projectId, ipfsHash, name, url, fileType);
    }

    function _updateFile(
        bytes16 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType
    ) internal {
        require(projectId != bytes16(0), 'Must have projectId');
        require(uint8(fileType) > 0, "FileType must be correct enum value");
        require(bytes(ipfsHash).length > 0,
            'Must have non-zero IPFS hash');

        uint8 oldType = getFileType(projectId, ipfsHash);
        if (fileType != oldType) {
            bytes32[] storage indexes = typeIndexes[projectId][oldType];
            for (uint256 i = 0; i < indexes.length; i++) {
                if(indexes[i] == keccak256(abi.encodePacked(ipfsHash))) {
                    indexes[i] = indexes[indexes.length - 1];
                    indexes.length--;
                    break;
                }
            }
            typeIndexes[projectId][fileType].push(keccak256(abi.encodePacked(ipfsHash)));
            files[projectId][keccak256(abi.encodePacked(ipfsHash))].fileType = fileType;
        }

        emit UpdateFile(projectId, ipfsHash, name, url, fileType);
    }

    function _removeFile(bytes16 projectId, string ipfsHash) internal {
        require(bytes(files[projectId][keccak256(abi.encodePacked(ipfsHash))].ipfsHash).length > 0);

        uint8 fileType = getFileType(projectId, ipfsHash);
        bytes32[] storage indexes = typeIndexes[projectId][fileType];
        for (uint256 i = 0; i < indexes.length; i++) {
            if(indexes[i] == keccak256(abi.encodePacked(ipfsHash))) {
                indexes[i] = indexes[indexes.length - 1];
                indexes.length--;
                break;
            }
        }

        delete files[projectId][keccak256(abi.encodePacked(ipfsHash))].fileType;
        delete files[projectId][keccak256(abi.encodePacked(ipfsHash))].ipfsHash;

        emit DeleteFile(projectId, ipfsHash);
    }
}
