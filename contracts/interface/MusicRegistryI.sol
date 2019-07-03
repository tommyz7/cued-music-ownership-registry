pragma solidity >=0.5.0 <0.6.0;

pragma experimental "ABIEncoderV2";


interface MusicRegistryI {
    modifier onlyRole(bytes16 _projectId, string memory _role){_;}
    function isOwner(bytes32 projectId, address sender) external returns (bool);
}
