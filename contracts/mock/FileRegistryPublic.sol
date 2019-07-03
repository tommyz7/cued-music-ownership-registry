pragma solidity >=0.5.0 <0.6.0;
pragma experimental "ABIEncoderV2";

import "../FileRegistry.sol";

contract FileRegistryPublic is FileRegistry {
    function addFilePublic(
        bytes32 projectId,
        string memory ipfsHash,
        string memory name,
        string memory url,
        uint8 fileType
    ) public {
        _addFile(projectId, ipfsHash, name, url, fileType);
    }

    function updateFilePublic(
        bytes32 projectId,
        string memory ipfsHash,
        string memory name,
        string memory url,
        uint8 fileType
    ) public {
        _updateFile(projectId, ipfsHash, name, url, fileType);
    }

    function removeFilePublic(bytes32 projectId, string memory ipfsHash) public {
        _removeFile(projectId, ipfsHash);
    }

    function addFileType(string memory fileType) public {
        _addFileType(fileType);
    }

    function validateSignature(bytes32 hash, bytes memory signature, address signer)
        public
        returns (address)
    {
        return _validateSignature(hash, signature, signer);
    }
}
