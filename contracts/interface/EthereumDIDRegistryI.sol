pragma solidity ^0.4.24;

interface EthereumDIDRegistryI {
    function getIdentity (address actor) external view returns(address);
    function isIdentityOwner (address identity, address actor) external view returns(bool);
    function validDelegate (address identity, bytes32 delegateType, address delegate) external view returns(bool);
    function changeOwner (address identity, address newOwner) external;
    function changeOwnerSigned (address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, address newOwner) external;
    function addDelegate (address identity, bytes32 delegateType, address delegate, uint validity) external;
    function revokeDelegate (address identity, bytes32 delegateType, address delegate) external;
    function setAttribute (address identity, bytes32 name, bytes value, uint validity) external;
    function revokeAttribute (address identity, bytes32 name, bytes value) external;
}
