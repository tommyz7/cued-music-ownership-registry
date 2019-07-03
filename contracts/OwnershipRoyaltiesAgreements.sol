pragma solidity >=0.5.0 <0.6.0;
pragma experimental "ABIEncoderV2";


import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "zos-lib/contracts/Initializable.sol";
import "./EthereumDIDResolver.sol";
import "./SignatureValidator.sol";
// import "./library/Transfers.sol";


contract OwnershipRoyaltiesAgreements is Initializable, EthereumDIDResolver, SignatureValidator {
    using SafeMath for uint256;
    // use that lib after migration to slidity version 0.5.0
    // using Transfers for *;

    mapping (address => uint256) private _ownershipBalances;
    uint256 private _ownershipTotalSupply;

    mapping (address => uint256) private _royaltiesBalances;
    uint256 private _royaltiesTotalSupply;

    mapping(address => uint256) private nonce;

    event NewOwnershipAgreement(
        string templateVersion,
        bytes32 templateHash,
        bytes sigSenders,
        bytes sigReceivers,
        address[] senderSigners,
        address[] senderIdentities,
        address[] receiverSigners,
        address[] receiverIdentities,
        uint256[] values);

    event NewRoyaltiesAgreement(
        string templateVersion,
        bytes32 templateHash,
        bytes sigSenders,
        bytes sigReceivers,
        address[] senderSigners,
        address[] senderIdentities,
        address[] receiverSigners,
        address[] receiverIdentities,
        uint256[] values);

    event OwnershipTransfer(
        address from,
        address to,
        uint256 value);

    event RoyaltiesTransfer(
        address from,
        address to,
        uint256 value);


    function init(address _ownerKey, address _ethDID) public initializer {
        setRegistry(_ethDID);
        mint(getIdentity(_ownerKey), 100 ether);
    }

    function nonceFor(address owner) public view returns (uint256) {
        return  nonce[owner];
    }

    /**
    * @dev Total number of tokens in existence
    */
    function totalSupplyOwnership() public view returns (uint256) {
        return _ownershipTotalSupply;
    }

    /**
    * @dev Gets the ownership of the specified address.
    * @param owner The address to query the balance of.
    * @return An uint256 representing the amount owned by the passed address.
    */
    function balanceOfOwnership(address owner) public view returns (uint256) {
        return _ownershipBalances[owner];
    }

    /**
    * @dev Total number of tokens in existence
    */
    function totalSupplyRoyalties() public view returns (uint256) {
        return _royaltiesTotalSupply;
    }

    /**
    * @dev Gets the ownership of the specified address.
    * @param owner The address to query the balance of.
    * @return An uint256 representing the amount owned by the passed address.
    */
    function balanceOfRoyalties(address owner) public view returns (uint256) {
        return _royaltiesBalances[owner];
    }

    /**
     * Creates new agreement for ownership transfer
     * @dev 56020 gas for sent data (includes 21k min fee)
     * @param  templateHash     ipfs compatible hash of legal file timplate
     * @param  templateVersion  legal template file version
     * @param  sigSenders       singatures of senders in compact from
     * @param  sigReceivers     signatures of receivers in compact form
     * @param  senderSigners    addresses of senders used to sign the tx
     * @param  receiverSigners  addresses of receivers used to sign the tx
     * @param  values           value of the trasnfer (1 ETH == 1%)
     */
    function newOwnershipTransferAgreement(
        bytes32 templateHash,
        string memory templateVersion,
        bytes memory sigSenders,
        bytes memory sigReceivers,
        address[] memory senderSigners,
        address[] memory receiverSigners,
        uint256[] memory values
    ) public {
        // 780 gas
        address[] memory senderIds = new address[](values.length);
        // 780 gas
        address[] memory receiverIds = new address[](values.length);

        require(templateHash != bytes32(0), 'templateHash cannot be empty');
        require(bytes(templateVersion).length > 0, 'templateVersion cannot be empty');
        require(sigSenders.length == values.length * 65
            && sigSenders.length == sigReceivers.length,
            'Each value trasnfer should have a signature');
        require(senderSigners.length == receiverSigners.length
            && receiverSigners.length == values.length,
            'senderSigners, receiverSigners and value length must match');
        address senderId;
        address receiverId;
        for (uint8 i = 0; i < values.length; i++) {
            // 53k gas
            (senderId, receiverId) = _validateSignatures(
                "OwnershipTransfer",
                templateHash,
                senderSigners[i],
                receiverSigners[i],
                values[i],
                sigSenders,
                sigReceivers,
                i
            );
            senderIds[i] = senderId;
            receiverIds[i] = receiverId;
            // 58k gas per transfer
            transferOwnership(senderId, receiverId, values[i]);
        }

        // 24k gas
        emit NewOwnershipAgreement(
            templateVersion,
            templateHash,
            sigSenders,
            sigReceivers,
            senderSigners,
            senderIds,
            receiverSigners,
            receiverIds,
            values
        );
    }

    /**
     * Creates new agreement for royalties transfer
     * @param  templateHash     ipfs compatible hash of legal file timplate
     * @param  templateVersion  legal template file version
     * @param  sigSenders       singatures of senders in compact from
     * @param  sigReceivers     signatures of receivers in compact form
     * @param  senderSigners    addresses of senders used to sign the tx
     * @param  receiverSigners  addresses of receivers used to sign the tx
     * @param  values           value of the trasnfer (1 ETH == 1%)
     */
    function newRoyaltiesTransferAgreement(
        bytes32 templateHash,
        string memory templateVersion,
        bytes memory sigSenders,
        bytes memory sigReceivers,
        address[] memory senderSigners,
        address[] memory receiverSigners,
        uint256[] memory values
    ) public {
        address[] memory senderIds = new address[](values.length);
        address[] memory receiverIds = new address[](values.length);

        require(templateHash != bytes32(0), 'templateHash cannot be empty');
        require(bytes(templateVersion).length > 0, 'templateVersion cannot be empty');
        require(sigSenders.length == values.length * 65
            && sigSenders.length == sigReceivers.length,
            'Each value trasnfer should have a signature');
        require(senderSigners.length == receiverSigners.length
            && receiverSigners.length == values.length,
            'senderSigners, receiverSigners and value length must match');
        address senderId;
        address receiverId;
        for (uint8 i = 0; i < values.length; i++) {
            (senderId, receiverId) = _validateSignatures(
                "RoyaltiesTransfer",
                templateHash,
                senderSigners[i],
                receiverSigners[i],
                values[i],
                sigSenders,
                sigReceivers,
                i
            );
            senderIds[i] = senderId;
            receiverIds[i] = receiverId;

            transferRoyalties(senderId, receiverId, values[i]);
        }

        emit NewRoyaltiesAgreement(
            templateVersion,
            templateHash,
            sigSenders,
            sigReceivers,
            senderSigners,
            senderIds,
            receiverSigners,
            receiverIds,
            values
        );
    }

    function _validateSignatures(
        string memory transferType,
        bytes32 templateHash,
        address senderSigner,
        address receiverSigner,
        uint256 value,
        bytes memory sigSenders,
        bytes memory sigReceivers,
        uint8 i
    ) internal returns (address senderId, address receiverId) {
        require(senderSigner != address(0), 'Zero address cannot send TX');
        require(receiverSigner != address(0), 'Zero address cannot receive rights');
        require(value > 0, 'Value must be greater than zero');

        // 4k gas
        senderId = getIdentity(senderSigner);
        // 4k gas
        receiverId = getIdentity(receiverSigner);

        // 1.5k gas
        bytes32 hash = getHash(
            senderSigner,
            transferType,
            templateHash,
            [senderId, receiverId],
            value
        );
        // 5k gas
        nonce[senderSigner]++;
        // 5k gas
        require(senderSigner == recoverKey(hash, sigSenders, i),
            'Message has not been signed properly by sender');

        // 1.5k gas
        hash = getHash(
            receiverSigner,
            transferType,
            templateHash,
            [senderId, receiverId],
            value
        );
        // 20k gas (since it's most likely new owner)
        nonce[receiverSigner]++;
        // 5k gas
        require(receiverSigner == recoverKey(hash, sigReceivers, i),
            'Message has not been signed properly by receiver');
    }

    function getHash(
        address signer,
        string memory transferType,
        bytes32 templateHash,
        address[2] memory identities,
        uint value
    ) public view returns(bytes32) {
        return keccak256(
            abi.encodePacked(
                byte(0x19), byte(0), address(this),
                transferType,
                templateHash,
                identities[0],
                identities[1],
                value,
                nonce[signer]
            )
        );
    }

    function transferOwnership(
        address from,
        address to,
        uint256 value
    ) internal {
        uint256 royatlyValue = _royaltiesBalances[from].mul(value).div(_ownershipBalances[from]);

        require(value <= _ownershipBalances[from], 'Cannot transfer bigger value than balance');
        require(to != address(0), 'Cannot transfer to zero address');
        require(value >= 0.1 ether, 'Require percentage transfer at least of 0.1%');

        _ownershipBalances[from] = _ownershipBalances[from].sub(value);
        _ownershipBalances[to] = _ownershipBalances[to].add(value);

        require(_ownershipBalances[from] >= 0.1 ether, 'Sender balance cannot be smaller than 0.1% after transfer');
        emit OwnershipTransfer(from, to, value);


        require(royatlyValue <= _royaltiesBalances[from], 'Cannot transfer bigger value than balance');
        require(to != address(0), 'Cannot transfer to zero address');
        require(royatlyValue >= 0.1 ether, 'Require percentage transfer at least of 0.1%');

        _royaltiesBalances[from] = _royaltiesBalances[from].sub(royatlyValue);
        _royaltiesBalances[to] = _royaltiesBalances[to].add(royatlyValue);

        require(_royaltiesBalances[from] >= 0.1 ether, 'Sender balance cannot be smaller than 0.1% after transfer');
        emit RoyaltiesTransfer(from, to, royatlyValue);
    }

    function transferRoyalties(
        address from,
        address to,
        uint256 value
    ) internal {
        require(value <= _royaltiesBalances[from], 'Cannot transfer bigger value than balance');
        require(to != address(0), 'Cannot transfer to zero address');
        require(value >= 0.1 ether, 'Require percentage transfer at least of 0.1%');

        _royaltiesBalances[from] = _royaltiesBalances[from].sub(value);
        _royaltiesBalances[to] = _royaltiesBalances[to].add(value);

        require(_royaltiesBalances[from] >= 0.1 ether, 'Sender balance cannot be smaller than 0.1% after transfer');
        emit RoyaltiesTransfer(from, to, value);
    }

    function mint(
        address account,
        uint256 value
    ) internal returns (uint256) {
        require(account != address(0));
        _ownershipBalances[account] = _ownershipBalances[account].add(value);
        _ownershipTotalSupply = _ownershipTotalSupply.add(value);
        emit OwnershipTransfer(address(0), account, value);

        _royaltiesBalances[account] = _royaltiesBalances[account].add(value);
        _royaltiesTotalSupply = _royaltiesTotalSupply.add(value);
        emit RoyaltiesTransfer(address(0), account, value);
        return value;
    }
}
