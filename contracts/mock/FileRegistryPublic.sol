pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";

import "../FileRegistry.sol";

contract FileRegistryPublic is FileRegistry {
    function addFile(
        bytes16 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType
    ) public {
        _addFile(projectId, ipfsHash, name, url, fileType);
    }

    function updateFile(
        bytes16 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType
    ) public {
        _updateFile(projectId, ipfsHash, name, url, fileType);
    }

    function removeFile(bytes16 projectId, string ipfsHash) public {
        _removeFile(projectId, ipfsHash);
    }

    function addFileType(string fileType) public {
        _addFileType(fileType);
    }
}
