pragma solidity ^0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";


interface MusicRegistryI {
    modifier onlyRole(bytes16 _projectId, string _role){_;}
    function isOwner(bytes32 projectId, address sender) external returns (bool);
}
