// SPDX-License-Identifier: MIT

// TODO:
// Mark loan active inactive if there is no lender yet.
// Integrate token contract

pragma solidity ^0.8.0;

contract LendingSystem {
    struct Loan {
        address borrower;
        address lender;
        uint256 amount;
        uint256 interestRate;
        uint256 repaymentTerm; // In days
        uint256 repaymentDueDate;
        string description;
        uint256 penaltyRate; // Penalty rate in percentage
        bool isActive;
    }

    mapping(uint256 => Loan) public loans;

    uint256 public totalLoans;

    event LoanCreated(address borrower, uint256 loanID, uint256 amount);
    event LoanInvested(
        uint256 loanID,
        address lender,
        uint256 investmentAmount
    );
    event LoanRepaid(uint256 loanID, address borrower, uint256 repaymentAmount);

    constructor() {}

    function createLoan(
        uint256 amount,
        uint256 interestRate,
        uint256 repaymentTerm,
        string memory description,
        uint256 penaltyRate
    ) public returns (uint256 loanID) {
        // Require that the borrower is not the zero address

        // Require that the amount is positive
        require(amount > 0);

        // Require that the interest rate is positive
        require(interestRate > 0);

        // Require that the repayment term is positive
        require(repaymentTerm > 0);

        // Require that the penalty rate is not negative
        require(penaltyRate >= 0);

        loanID = totalLoans;
        loans[loanID] = Loan({
            borrower: msg.sender,
            lender: address(0),
            amount: amount,
            interestRate: interestRate,
            repaymentTerm: repaymentTerm,
            repaymentDueDate: block.timestamp + repaymentTerm * 1 days,
            description: description,
            penaltyRate: penaltyRate,
            isActive: true
        });

        totalLoans++;
        emit LoanCreated(msg.sender, loanID, amount);

        return loanID;
    }

    function investInLoan(uint256 loanID) public payable {
        // Require that the loan ID is valid
        require(loanID < totalLoans, "loan id invalid");

        // Require that the loan is active
        require(loans[loanID].isActive,"loan not active");

        // Require that the investment amount is equal to the loan amount
        require(msg.value >= loans[loanID].amount-1,"loan amount not enough");

        // Set the lender of the loan
        loans[loanID].lender = msg.sender;

        // Transfer the investment amount to the borrower
        payable(loans[loanID].borrower).transfer(msg.value);
        emit LoanInvested(loanID, msg.sender, msg.value);
    }

    function repayLoan(uint256 loanID) public payable {
        // Require that the loan ID is valid
        require(loanID < totalLoans);

        // Require that the loan is active
        require(loans[loanID].isActive);

        // Require that the repayment amount is positive
        require(msg.value > 0);

        // Calculate the total interest due
        uint256 interestDue = (loans[loanID].amount *
            loans[loanID].interestRate) / 100;

        // Calculate the total amount to repay
        uint256 totalAmountToRepay = loans[loanID].amount + interestDue;

        // Calculate penalty if repayment is late
        uint256 penalty = 0;
        if (block.timestamp > loans[loanID].repaymentDueDate) {
            // Calculate the number of days late
            uint256 daysLate = (block.timestamp -
                loans[loanID].repaymentDueDate) / 1 days;

            // Apply penalty rate
            penalty =
                (totalAmountToRepay * daysLate * loans[loanID].penaltyRate) /
                10000; // penaltyRate is in percentage
        }

        // Total repayment amount including penalty
        uint256 totalRepaymentAmount = totalAmountToRepay + penalty;

        // Require that the repayment amount covers the total amount plus any penalties
        require(msg.value >= totalRepaymentAmount-1,"Wrong amount sent");

        // Transfer the repayment amount including penalty to the lender
        payable(loans[loanID].lender).transfer(totalRepaymentAmount);
        emit LoanRepaid(loanID, msg.sender, totalRepaymentAmount);

        // Set the loan to inactive
        loans[loanID].isActive = false;
    }

    function getLoanDetails(uint256 loanID)
        public
        view
        returns (Loan memory loan)
    {
        return loans[loanID];
    }

    function getAmountDue(uint256 loanID) public view returns (uint256) {
        // Require that the loan ID is valid
        require(loanID < totalLoans);

        // Require that the loan is active
        require(loans[loanID].isActive);

        // Calculate the total interest due
        uint256 interestDue = (loans[loanID].amount *
            loans[loanID].interestRate) / 100;

        // Calculate the total amount to repay
        uint256 totalAmountToRepay = loans[loanID].amount + interestDue;

        // Calculate penalty if repayment is late
        uint256 penalty = 0;
        if (block.timestamp > loans[loanID].repaymentDueDate) {
            // Calculate the number of days late
            uint256 daysLate = (block.timestamp -
                loans[loanID].repaymentDueDate) / 1 days;

            // Apply penalty rate
            penalty =
                (totalAmountToRepay * daysLate * loans[loanID].penaltyRate) /
                10000; // penaltyRate is in percentage
        }

        // Total amount due including penalty
        uint256 totalAmountDue = totalAmountToRepay + penalty;

        return totalAmountDue;
    }
}
