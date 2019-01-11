pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";

import "../FileRegistry.sol";

contract FileRegistryPublic is FileRegistry {
    function addFilePublic(
        bytes32 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType
    ) public {
        _addFile(projectId, ipfsHash, name, url, fileType);
    }

    function updateFilePublic(
        bytes32 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType
    ) public {
        _updateFile(projectId, ipfsHash, name, url, fileType);
    }

    function removeFilePublic(bytes32 projectId, string ipfsHash) public {
        _removeFile(projectId, ipfsHash);
    }

    function addFileType(string fileType) public {
        _addFileType(fileType);
    }

    function validateSignature(bytes32 hash, bytes signature, address signer)
        public
        returns (address)
    {
        return _validateSignature(hash, signature, signer);
    }
}
