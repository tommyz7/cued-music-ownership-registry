pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";


import "zos-lib/contracts/Initializable.sol";
import "./interface/OwnershipRoyaltiesAgreementsI.sol";
import "./interface/ProxyFactoryI.sol";
import "./UUIDCounter.sol";
import "./EthereumDIDResolver.sol";
import "./SignatureValidator.sol";
import "./library/MusicLib.sol";

/**
 * @title Music Registry Smart Contract
 *
 * @dev Smart Contract that stores Compositions and Recordings metadata. Data stored is
 *      bassed on Open Music Initiative API.
 *
 * See https://omi01.docs.apiary.io/#reference/work-related-apis/works-collection/register-a-work
 *
 */
contract MusicRegistry is Initializable, EthereumDIDResolver, UUIDCounter, SignatureValidator {

    using MusicLib for MusicLib.Work;
    using MusicLib for MusicLib.Recording;

    uint8 public constant WORK_FLAG = 87;
    uint8 public constant RECORDING_FLAG = 82;

    ProxyFactoryI public proxyFactory;

    mapping(address => uint256) public nonce;

    mapping(bytes32 => MusicLib.Work) public works;

    event WorkRegistered(
        bytes32 indexed workId,
        string title,
        string titleSoundRecording,
        bytes32 indexed iswc,
        bytes32 territory,
        address[] publishers,
        address indexed ownershipContract);

    event WorkUpdated(
        bytes32 indexed workId,
        string title,
        string titleSoundRecording,
        bytes32 indexed iswc,
        bytes32 territory,
        address[] publishers,
        address indexed ownershipContract);

    event WorkRemoved(bytes32 workId);

    mapping(bytes32 => MusicLib.Recording) public recordings;

    event RecordingRegistered(
        bytes32 indexed recordingId,
        string title,
        string versionTitle,
        bytes32 indexed isrc,
        bytes32 territory,
        bytes32 album_upc,
        address[] labels,
        bytes32[] workIds,
        address indexed ownershipContract);

    event RecordingUpdated(
        bytes32 indexed recordingId,
        string title,
        string versionTitle,
        bytes32 indexed isrc,
        bytes32 territory,
        bytes32 album_upc,
        address[] labels,
        bytes32[] workIds,
        address indexed ownershipContract);

    event RecordingRemoved(bytes32 recordingId);


    modifier onlyOwner(bytes32 projectId, address sender) {
        address ownershipContract;
        if (uint8(projectId[0]) == WORK_FLAG)
            ownershipContract = works[projectId].ownershipContract;
        else if (uint8(projectId[0]) == RECORDING_FLAG)
            ownershipContract = recordings[projectId].ownershipContract;
        require(ownershipContract != address(0), 'ownershipContract cannot be zero');
        require(OwnershipRoyaltiesAgreementsI(ownershipContract).balanceOfOwnership(getIdentity(sender)) > 0, 'sender must have ownership');
        _;
    }

    function init(address ethDIDAddress, address factory) public initializer {
        setRegistry(ethDIDAddress);
        proxyFactory = ProxyFactoryI(factory);
    }

    function getPublishers(bytes32 projectId) public view returns (address[]) {
        return works[projectId].publishers;
    }

    function getLabels(bytes32 projectId) public view returns (address[]) {
        return recordings[projectId].labels;
    }

    function getWorkIds(bytes32 projectId) public view returns (bytes32[]) {
        return recordings[projectId].workIds;
    }

    function registerWork(
        MusicLib.Work metadata,
        bytes signature,
        bytes data,
        address signer
    ) public {
        require(bytes(metadata.title).length > 0, "metadata.title is required");
        require(bytes(metadata.titleSoundRecording).length > 0, "metadata.title is required");
        require(signature.length > 0, "signature is required");
        require(signer != address(0), "signer is required");

        bytes32 hash = metadata.getWorkHash("registerWork", data, nonce[signer]);
        address admin = _validateSignature(hash, signature, signer);
        address proxyAddress = proxyFactory.deploy(admin, data);
        metadata.ownershipContract = proxyAddress;
        bytes32 workId = newID(WORK_FLAG);
        works[workId] = metadata;

        emit WorkRegistered(
            workId,
            metadata.title,
            metadata.titleSoundRecording,
            metadata.iswc,
            metadata.territory,
            metadata.publishers,
            proxyAddress);
    }

    function updateWork(
        bytes32 workId,
        MusicLib.Work metadata,
        bytes signature,
        address signer
    ) public onlyOwner(workId, signer) {
        require(workId != bytes32(0), "workId is required");
        require(works[workId].ownershipContract != address(0), 'Work must exist');
        require(bytes(metadata.title).length > 0, "metadata.title is required");
        require(bytes(metadata.titleSoundRecording).length > 0, "metadata.title is required");
        require(signature.length > 0, "signature is required");
        require(signer != address(0), "signer is required");

        bytes32 hash = metadata.getWorkHash("updateWork", workId, nonce[signer]);
        _validateSignature(hash, signature, signer);
        // do not allow for ownership contract address change
        metadata.ownershipContract = works[workId].ownershipContract;
        works[workId] = metadata;

        emit WorkUpdated(
            workId,
            metadata.title,
            metadata.titleSoundRecording,
            metadata.iswc,
            metadata.territory,
            metadata.publishers,
            metadata.ownershipContract);
    }

    function removeWork(bytes32 workId, bytes signature, address signer)
        public
        onlyOwner(workId, signer)
    {
        require(workId != bytes32(0), "workId is required");
        require(signature.length > 0, "signature is required");
        require(signer != address(0), "signer is required");

        bytes32 hash = MusicLib.getWorkHash("removeWork", workId, nonce[signer]);
        _validateSignature(hash, signature, signer);

        delete works[workId];
        emit WorkRemoved(workId);
    }

    function registerRecording(
        MusicLib.Recording metadata,
        bytes signature,
        bytes data,
        address signer
    ) public {
        require(bytes(metadata.title).length > 0, "metadata.title is required");
        require(signature.length > 0, "signature is required");
        require(signer != address(0), "signer is required");

        // saving usage of variables as workaround for stack too deep error
        bytes32 hash = metadata.getRecordingHash("registerRecording", data, nonce[signer]);
        address proxyAddress = proxyFactory.deploy(
            _validateSignature(hash, signature, signer),
            data
        );
        metadata.ownershipContract = proxyAddress;
        bytes32 recordingId = newID(RECORDING_FLAG);
        recordings[recordingId] = metadata;

        emit RecordingRegistered(
            recordingId,
            metadata.title,
            metadata.versionTitle,
            metadata.isrc,
            metadata.territory,
            metadata.album_upc,
            metadata.labels,
            metadata.workIds,
            proxyAddress);
    }

    function updateRecording(
        bytes32 recordingId,
        MusicLib.Recording metadata,
        bytes signature,
        address signer
    ) public onlyOwner(recordingId, signer) {
        require(recordingId != bytes32(0), "recordingId is required");
        require(bytes(metadata.title).length > 0, "metadata.title is required");
        require(signature.length > 0, "signature is required");
        require(signer != address(0), "signer is required");

        bytes32 hash = metadata.getRecordingHash("updateRecording", recordingId, nonce[signer]);
        _validateSignature(hash, signature, signer);
        // do not allow for ownership contract address change
        metadata.ownershipContract = recordings[recordingId].ownershipContract;
        recordings[recordingId] = metadata;

        emit RecordingUpdated(
            recordingId,
            metadata.title,
            metadata.versionTitle,
            metadata.isrc,
            metadata.territory,
            metadata.album_upc,
            metadata.labels,
            metadata.workIds,
            recordings[recordingId].ownershipContract);
    }

    function removeRecording(bytes32 recordingId, bytes signature, address signer)
        public
        onlyOwner(recordingId, signer)
    {
        require(recordingId != bytes32(0), "recordingId is required");
        require(signature.length > 0, "signature is required");
        require(signer != address(0), "signer is required");

        bytes32 hash = MusicLib.getRecordingHash("removeRecording", recordingId, nonce[signer]);
        _validateSignature(hash, signature, signer);

        delete recordings[recordingId];
        emit RecordingRemoved(recordingId);
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
