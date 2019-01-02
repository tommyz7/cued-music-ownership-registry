pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";


import "zos-lib/contracts/Initializable.sol";
import "./interface/OwnershipRoyaltiesAgreementsI.sol";
import "./interface/ProxyFactoryI.sol";
import "./FileRegistry.sol";
import "./UUIDCounter.sol";
import "./EthereumDIDResolver.sol";
import "./SignatureValidator.sol";


/**
 * @title Music Registry Smart Contract
 *
 * @dev Smart Contract that stores Compositions and Recordings metadata. Data stored is
 *      bassed on Open Music Initiative API.
 *
 * See https://omi01.docs.apiary.io/#reference/work-related-apis/works-collection/register-a-work
 *
 */
contract MusicRegistry is Initializable, EthereumDIDResolver, UUIDCounter, FileRegistry, SignatureValidator {

    uint8 public constant WORK_FLAG = 87;
    uint8 public constant RECORDING_FLAG = 82;

    ProxyFactoryI public factory;

    mapping(address => uint256) private nonce;

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

    mapping(bytes32 => Work) public works;

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

    mapping(bytes32 => Recording) public recordings;

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

    function init(address factory) public initializer {
        factory = ProxyFactoryI(factory);
    }

    function registerWork(
        Work metadata,
        bytes signature,
        bytes data,
        address signer
    ) public {
        bytes32 hash = keccak256(
            abi.encodePacked(
                abi.encodePacked(
                    byte(0x19), byte(0), address(this),
                    "registerWork"
                ),
                abi.encodePacked(
                    metadata.title,
                    metadata.titleSoundRecording,
                    metadata.iswc,
                    metadata.territory,
                    metadata.publishers,
                    data,
                    nonce[signer]
                )
            )
        );

        address admin = _validateSignature(hash, signature, signer);
        address proxyAddress = factory.deploy(admin, data);

        Work memory _work = Work(
            metadata.title,
            metadata.titleSoundRecording,
            metadata.iswc,
            metadata.territory,
            metadata.publishers,
            proxyAddress
        );

        bytes32 workId = newID(WORK_FLAG);
        require(works[workId].ownershipContract == address(0), 'workId must be unused');
        works[workId] = _work;

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
        Work metadata,
        bytes signature,
        address signer
    ) public onlyOwner(workId, signer) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                abi.encodePacked(
                    byte(0x19), byte(0), address(this),
                    "updateWork"
                ),
                abi.encodePacked(
                    workId,
                    metadata.title,
                    metadata.titleSoundRecording,
                    metadata.iswc,
                    metadata.territory,
                    metadata.publishers,
                    nonce[signer]
                )
            )
        );
        _validateSignature(hash, signature, signer);

        works[workId].title = metadata.title;
        works[workId].titleSoundRecording = metadata.titleSoundRecording;
        works[workId].iswc = metadata.iswc;
        works[workId].territory = metadata.territory;
        works[workId].publishers = metadata.publishers;

        emit WorkUpdated(
            workId,
            metadata.title,
            metadata.titleSoundRecording,
            metadata.iswc,
            metadata.territory,
            metadata.publishers,
            works[workId].ownershipContract);
    }

    function removeWork(bytes32 workId, bytes signature, address signer)
        public
        onlyOwner(workId, signer)
    {
        bytes32 hash = keccak256(
            abi.encodePacked(
                byte(0x19), byte(0), address(this),
                "removeWork",
                workId,
                nonce[signer]
            )
        );
        _validateSignature(hash, signature, signer);

        delete works[workId];
        emit WorkRemoved(workId);
    }

    function registerRecording(
        Recording metadata,
        bytes signature,
        bytes data,
        address signer
    ) public {
        // saving variables as workaround for stack too deep error
        address proxyAddress = factory.deploy(
            _validateSignature(keccak256(
                abi.encodePacked(
                    abi.encodePacked(
                        byte(0x19), byte(0), address(this),
                        "registerRecording"
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
                        nonce[signer]
                    )
                )
            ), signature, signer), data);

        Recording memory _recording = Recording(
            metadata.title,
            metadata.versionTitle,
            metadata.isrc,
            metadata.territory,
            metadata.album_upc,
            metadata.labels,
            metadata.workIds,
            proxyAddress
        );

        bytes32 recordingId = newID(RECORDING_FLAG);
        require(recordings[recordingId].ownershipContract == address(0),
            'recordingId must not be used previously');
        recordings[recordingId] = _recording;

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
        Recording metadata,
        bytes signature,
        address signer
    ) public onlyOwner(recordingId, signer) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                abi.encodePacked(
                    byte(0x19), byte(0), address(this),
                    "updateRecording"
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
                    nonce[signer]
                )
            )
        );
        _validateSignature(hash, signature, signer);

        recordings[recordingId].title = metadata.title;
        recordings[recordingId].versionTitle = metadata.versionTitle;
        recordings[recordingId].isrc = metadata.isrc;
        recordings[recordingId].territory = metadata.territory;
        recordings[recordingId].album_upc = metadata.album_upc;
        recordings[recordingId].labels = metadata.labels;
        recordings[recordingId].workIds = metadata.workIds;

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
        bytes32 hash = keccak256(
            abi.encodePacked(
                byte(0x19), byte(0), address(this),
                "removeRecording",
                recordingId,
                nonce[signer]
            )
        );
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
