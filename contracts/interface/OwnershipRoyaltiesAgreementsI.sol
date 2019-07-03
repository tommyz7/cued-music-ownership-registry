pragma solidity >=0.5.0 <0.6.0;
pragma experimental "ABIEncoderV2";


interface OwnershipRoyaltiesAgreementsI {
    function hasRole(address _operator, string calldata _role) external view returns (bool);
    function balanceOfOwnership(address owner) external view returns (uint256);
}
