pragma solidity >=0.5.0 <0.6.0;


import "zos-lib/contracts/Initializable.sol";
import "./AdminUpgradeabilityProxy.sol";
import "./RBAC.sol";


contract ProxyFactory is Initializable, RBAC {

    string public constant OWNER = "owner";
    string public constant REGISTRY = "registry";

    address public implementation;

    event ImplementationUpdate(address indexed oldImpl, address indexed newImpl);
    event ProxyDeploy(address indexed proxy, address admin, address sender);

    function init(address _owner, address _registry, address _implementation) public initializer {
        addRole(_owner, OWNER);
        addRole(_registry, REGISTRY);
        implementation = _implementation;
    }

    function setImplementation(address _implementation) public onlyRole(OWNER) {
        emit ImplementationUpdate(implementation, _implementation);
        implementation = _implementation;
    }

    function deploy(address _admin, bytes memory _data) public onlyRole(REGISTRY) returns (address) {
        AdminUpgradeabilityProxy proxy =
            new AdminUpgradeabilityProxy(implementation, _admin, _data);
        emit ProxyDeploy(address(proxy), _admin, msg.sender);
        return address(proxy);
    }
}
