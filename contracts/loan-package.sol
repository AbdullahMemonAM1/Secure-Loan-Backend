// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISoulboundNFT {
    function getUserInfo(address userAddress)
        external
        view
        returns (
            string memory,
            string memory,
            uint256,
            uint256,
            bool
        );

    function setUserRating(address userAddress, uint256 rating) external;

    function getUserRating(address userAddress) external view returns (uint256);

    function setUserMaxLimit(address userAddress, uint256 maxLimit) external;

    function getUserMaxLimit(address userAddress)
        external
        view
        returns (uint256);

    function setUserLoanStatus(address userAddress, bool loanStatus) external;

    function getUserLoanStatus(address userAddress)
        external
        view
        returns (bool);
}

contract LoanContract {
    struct LoanUser {
        uint256 loanAmountBorrowed;
        uint256 timeLeft;
        bool active;
    }

    struct LoanPackage {
        address packageOwner;
        uint256 bankAmount;
        uint256 loanAmount;
        uint256 interest;
        uint256 timeToReturn;
        uint256 startTime;
        bool active;
        string description;
        uint256 penaltyRate;
    }

    mapping(uint256 => LoanPackage) public loanPackages;
    mapping(address => LoanUser) public users;
    mapping(address => uint256[]) public ownerOfPackages;
    uint256 public packageCount;
    ISoulboundNFT public soulboundNFT;

    event LoanPackageStatusChanged(uint256 indexed packageId, bool isActive);
    event LoanPackageCreated(
        uint256 indexed id,
        address indexed packageOwner,
        uint256 bankAmount,
        uint256 loanAmount,
        uint256 interest,
        uint256 timeToReturn,
        string description,
        uint256 penaltyRate
    );
    event LoanBorrowed(
        uint256 indexed packageId,
        address indexed borrower,
        uint256 loanAmount
    );
    event LoanRepaid(
        uint256 indexed packageId,
        address indexed borrower,
        uint256 repaidAmount
    );

    constructor() {}

    function createLoanPackage(
        uint256 _bankAmountInEth,
        uint256 _loanAmountInEth,
        uint256 _interestRate,
        uint256 _timeToReturnInDays,
        string memory _description,
        uint256 _penaltyRate
    ) external payable {
        require(
            _loanAmountInEth <= _bankAmountInEth,
            "Loan amount cannot exceed bank amount"
        );
        require(
            _bankAmountInEth % _loanAmountInEth == 0,
            "Bank amount must be a multiple of loan amount"
        );
        require(
            msg.value == _bankAmountInEth,
            "Ether value sent must match the bank amount"
        );

        uint256 id = packageCount++;
        LoanPackage storage newPackage = loanPackages[id];
        newPackage.packageOwner = msg.sender;
        newPackage.bankAmount = _bankAmountInEth;
        newPackage.loanAmount = _loanAmountInEth;
        newPackage.interest = _interestRate;
        newPackage.timeToReturn = _timeToReturnInDays * 1 days;
        newPackage.startTime = block.timestamp;
        newPackage.active = true;
        newPackage.description = _description;
        newPackage.penaltyRate = _penaltyRate;

        emit LoanPackageCreated(
            id,
            msg.sender,
            _bankAmountInEth,
            _loanAmountInEth,
            _interestRate,
            _timeToReturnInDays,
            _description,
            _penaltyRate
        );
    }

    function setSoulboundNFTAddress(ISoulboundNFT _soulboundNFT) external {
        require(address(_soulboundNFT) != address(0), "Invalid address");
        soulboundNFT = _soulboundNFT;
    }

    function borrowFromPackage(uint256 packageId) external {
        LoanPackage storage package = loanPackages[packageId];
        require(package.active, "Loan package is not active");
        require(
            package.bankAmount > 0,
            "Bank amount is insufficient to grant a loan"
        );
        require(
            soulboundNFT.getUserLoanStatus(msg.sender) == false,
            "User already have a loan active"
        );
        require(
            soulboundNFT.getUserMaxLimit(msg.sender) >= package.loanAmount,
            "User not allowed to borrow this much"
        );

        uint256 loanAmount = package.loanAmount;
        payable(msg.sender).transfer(loanAmount);
        package.bankAmount -= loanAmount;

        users[msg.sender] = LoanUser(loanAmount, package.timeToReturn, true);
        soulboundNFT.setUserLoanStatus(msg.sender, true);

        emit LoanBorrowed(packageId, msg.sender, loanAmount);
    }

    function repayLoan(uint256 packageId) external payable {
        LoanPackage storage package = loanPackages[packageId];
        LoanUser storage user = users[msg.sender];
        require(package.active, "Loan package is not active");
        require(user.active, "You have not borrowed from any package");

        uint256 loanAmount = user.loanAmountBorrowed;
        uint256 interest = (loanAmount * package.interest) / 100;
        uint256 penaltyIncurred = calculatePenalty(packageId);
        uint256 amountToRepay = loanAmount + interest + penaltyIncurred;

        require(msg.value == amountToRepay, "Incorrect repayment amount");
        if (penaltyIncurred != 0) {
            soulboundNFT.setUserRating(
                msg.sender,
                soulboundNFT.getUserRating(msg.sender) - 10
            );
        }

        package.bankAmount += loanAmount;
        delete users[msg.sender];
        soulboundNFT.setUserLoanStatus(msg.sender, false);
        soulboundNFT.setUserMaxLimit(
            msg.sender,
            soulboundNFT.getUserMaxLimit(msg.sender) + 200
        );
        soulboundNFT.setUserRating(
            msg.sender,
            soulboundNFT.getUserRating(msg.sender) + 10
        );

        emit LoanRepaid(packageId, msg.sender, msg.value);
    }

    function togglePackageActive(uint256 packageId, bool isActive) external {
        require(
            msg.sender == loanPackages[packageId].packageOwner,
            "Only the owner can change the active status"
        );
        loanPackages[packageId].active = isActive;
        emit LoanPackageStatusChanged(packageId, isActive);
    }

    function getRemainingTimeInDays() public view returns (uint256) {
        uint256 remainingTime = users[msg.sender].timeLeft;
        return remainingTime / 1 days;
    }

    function getOwedAmount(uint256 packageId) public view returns (uint256) {
        LoanPackage storage package = loanPackages[packageId];
        LoanUser storage user = users[msg.sender];
        uint256 loanAmount = user.loanAmountBorrowed;
        uint256 interest = (loanAmount * package.interest) / 100;
        uint256 penaltyAmount = calculatePenalty(packageId);
        return loanAmount + interest + penaltyAmount;
    }

    function getPackagesByOwner(address owner)
        external
        view
        returns (uint256[] memory)
    {
        return ownerOfPackages[owner];
    }

    function getUserProfile(address user)
        external
        view
        returns (
            uint256,
            uint256,
            bool
        )
    {
        LoanUser storage userProfile = users[user];
        return (
            userProfile.loanAmountBorrowed,
            userProfile.timeLeft,
            userProfile.active
        );
    }

    function getLoanPackageOwner(uint256 packageId)
        external
        view
        returns (address)
    {
        return loanPackages[packageId].packageOwner;
    }

    function getCurrentTime() external view returns (uint256) {
        return block.timestamp;
    }

    function getLoanPackageDetails(uint256 packageId)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            bool,
            string memory,
            uint256
        )
    {
        LoanPackage storage package = loanPackages[packageId];
        return (
            package.bankAmount,
            package.loanAmount,
            package.interest,
            package.timeToReturn,
            package.startTime,
            package.active,
            package.description,
            package.penaltyRate
        );
    }

    function calculatePenalty(uint256 packageId)
        internal
        view
        returns (uint256)
    {
        LoanPackage storage package = loanPackages[packageId];
        uint256 elapsedTime = block.timestamp - package.startTime;
        uint256 elapsedDays = elapsedTime / 1 days;
        uint256 remainingTime = package.timeToReturn - elapsedTime;

        if (elapsedDays > 0 && remainingTime > 0) {
            return
                (package.loanAmount * package.penaltyRate * elapsedDays) / 100;
        }
        return 0;
    }

    function depositToBank(uint256 packageId) external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        LoanPackage storage package = loanPackages[packageId];
        require(
            msg.sender == package.packageOwner,
            "Only the package owner can deposit funds"
        );

        require(package.active, "Loan package is not active");
        package.bankAmount += msg.value;
    }

    function withdrawFromBank(uint256 packageId, uint256 amount) external {
        LoanPackage storage package = loanPackages[packageId];
        require(package.active, "Loan package is not active");
        require(
            amount > 0 && amount <= package.bankAmount,
            "Invalid withdrawal amount"
        );
        require(
            msg.sender == package.packageOwner,
            "Only the package owner can withdraw funds"
        );

        package.bankAmount -= amount;
        payable(msg.sender).transfer(amount);
    }

    function getUserInfo(address userAddress)
        public
        view
        returns (
            string memory,
            string memory,
            uint256,
            uint256,
            bool
        )
    {
        return soulboundNFT.getUserInfo(userAddress);
    }

    function setUserMaxLimit(address userAddress, uint256 maxLimit) external {
        soulboundNFT.setUserMaxLimit(userAddress, maxLimit);
    }

    function setUserLoanStatus(address userAddress, bool loanStatus) external {
        soulboundNFT.setUserLoanStatus(userAddress, loanStatus);
    }
}
