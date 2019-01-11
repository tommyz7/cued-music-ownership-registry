pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";

import "zos-lib/contracts/Initializable.sol";
import "./SignatureValidator.sol";
import "./interface/MusicRegistryI.sol";

contract FileRegistry is Initializable, SignatureValidator {

    MusicRegistryI public musicRegistry;
    event MusicRegistrySet(address musicRegistry);

    mapping(address => uint256) public nonce;

    string[] public FILE_TYPES =
        ['Other', 'Agreement', 'Sheets', 'Notes', 'Stem', 'Track', 'Demo', 'FinalMix'];

    struct File {
        uint8 fileType;
        string ipfsHash;
    }

    // workId/recordingId => keccak256(abi.encodePacked(IPFS hash)) => File
    mapping(bytes32 => mapping(bytes32 => File)) public files;
    // workId/recordingId => FILE_TYPES => keccak256(abi.encodePacked(IPFS hashes))
    mapping(bytes32 => mapping(uint8 => bytes32[])) public typeIndexes;

    event NewFile (
        bytes32 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType);

    event UpdateFile (
        bytes32 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType);

    event DeleteFile (bytes32 indexed projectId, string ipfsHash);

    modifier onlyOwner(bytes32 projectId, address sender) {
        require(musicRegistry.isOwner(projectId, sender));
        _;
    }

    function init(address musicRegistryAddr) public initializer {
        musicRegistry = MusicRegistryI(musicRegistryAddr);
        emit MusicRegistrySet(musicRegistryAddr);
    }

    function getAllFileTypes() public view returns (string[]) {
        return FILE_TYPES;
    }

    function getFile(bytes32 projectId, string ipfsHash) public view returns (File) {
        return files[projectId][keccak256(abi.encodePacked(ipfsHash))];
    }

    function getFiles(bytes32 projectId, uint8 fileType) public view returns (File[]) {
        bytes32[] storage _fileHashes = typeIndexes[projectId][fileType];
        File[] memory result = new File[](_fileHashes.length);
        for (uint256 i = 0; i < _fileHashes.length; i++) {
            result[i] = files[projectId][_fileHashes[i]];
        }
        return result;
    }

    function getFileType(bytes32 projectId, string ipfsHash) public view returns (uint8) {
        return files[projectId][keccak256(abi.encodePacked(ipfsHash))].fileType;
    }

    function isProjectFile(bytes32 projectId, string ipfsHash) public view returns (bool) {
        return bytes(files[projectId][keccak256(abi.encodePacked(ipfsHash))].ipfsHash).length > 0;
    }



    function getIndexes(bytes32 projectId, uint8 fileType) public view returns (bytes32[]) {
        return typeIndexes[projectId][fileType];
    }

    function getHash(
        string funcName,
        bytes32 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType,
        uint256 _nonce
    )
        public
        view
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(
                byte(0x19), byte(0), address(this),
                funcName,
                projectId,
                ipfsHash,
                name,
                url,
                fileType,
                _nonce
            )
        );
    }

    // TODO: allow contract admin to add file types
    event NewFileType (uint8 index, string fileType);
    function _addFileType(string fileType) internal {
        FILE_TYPES.push(fileType);
        emit NewFileType(uint8(FILE_TYPES.length) - 1, fileType);
    }

    function addFile(
        bytes32 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType,
        bytes signature,
        address signer
    ) public {
        bytes32 hash = getHash("addFile", projectId, ipfsHash, name, url, fileType, nonce[signer]);
        _validateSignature(hash, signature, signer);
        _addFile(projectId, ipfsHash, name, url, fileType);
    }

    function updateFile(
        bytes32 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType,
        bytes signature,
        address signer
    ) public onlyOwner(projectId, signer) {
        bytes32 hash = getHash("updateFile", projectId, ipfsHash, name, url, fileType, nonce[signer]);
        _validateSignature(hash, signature, signer);
        _updateFile(projectId, ipfsHash, name, url, fileType);
    }

    function removeFile(bytes32 projectId, string ipfsHash, bytes signature, address signer)
        public
        onlyOwner(projectId, signer)
    {
        bytes32 hash = keccak256(
            abi.encodePacked(
                byte(0x19), byte(0), address(this),
                "removeFile",
                projectId,
                ipfsHash,
                nonce[signer]
            )
        );
        _validateSignature(hash, signature, signer);
        _removeFile(projectId, ipfsHash);
    }

    function _addFile(
        bytes32 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType
    ) internal {
        require(projectId != bytes32(0), 'Must have projectId');
        require(fileType < FILE_TYPES.length, "FileType must be correct value");
        require(bytes(ipfsHash).length > 0,
            'Must have non-zero IPFS hash');

        files[projectId][keccak256(abi.encodePacked(ipfsHash))] = File(fileType, ipfsHash);
        typeIndexes[projectId][fileType].push(keccak256(abi.encodePacked(ipfsHash)));

        emit NewFile(projectId, ipfsHash, name, url, fileType);
    }

    function _updateFile(
        bytes32 projectId,
        string ipfsHash,
        string name,
        string url,
        uint8 fileType
    ) internal {
        require(projectId != bytes32(0), 'Must have projectId');
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

    function _removeFile(bytes32 projectId, string ipfsHash) internal {
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

    function _validateSignature(bytes32 hash, bytes signature, address signer)
        internal
        returns (address)
    {
        require(hash != bytes32(0), 'hash cannot be empty');
        require(signature.length > 0, 'signature cannot be empty');
        require(signer != address(0), 'signer address cannot be empty');

        // 5k gas
        nonce[signer]++;

        // 5k gas
        require(signer == recoverKey(hash, signature, 0),
            'Message has not been signed properly by signer');

        return signer;
    }
}
