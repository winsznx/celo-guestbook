const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("GuestBook Contract", function () {
    // Fixture to deploy the contract
    async function deployGuestBookFixture() {
        const [owner, user1, user2, user3] = await ethers.getSigners();

        const GuestBook = await ethers.getContractFactory("GuestBook");
        const guestBook = await GuestBook.deploy();

        return { guestBook, owner, user1, user2, user3 };
    }

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            const { guestBook, owner } = await loadFixture(deployGuestBookFixture);
            expect(await guestBook.owner()).to.equal(owner.address);
        });

        it("Should set correct initial fees", async function () {
            const { guestBook } = await loadFixture(deployGuestBookFixture);

            expect(await guestBook.mintFee()).to.equal(ethers.parseEther("0.01"));
            expect(await guestBook.messageFee()).to.equal(ethers.parseEther("0.001"));
            expect(await guestBook.todoCreationFee()).to.equal(ethers.parseEther("0.00001"));
        });

        it("Should set correct validation constants", async function () {
            const { guestBook } = await loadFixture(deployGuestBookFixture);

            expect(await guestBook.MAX_NAME_LENGTH()).to.equal(50);
            expect(await guestBook.MAX_MESSAGE_LENGTH()).to.equal(280);
            expect(await guestBook.MAX_TODO_TITLE_LENGTH()).to.equal(100);
            expect(await guestBook.MAX_TODO_DESCRIPTION_LENGTH()).to.equal(500);
        });

        it("Should have correct ERC721 metadata", async function () {
            const { guestBook } = await loadFixture(deployGuestBookFixture);

            expect(await guestBook.name()).to.equal("GuestBook Pass");
            expect(await guestBook.symbol()).to.equal("GBP");
        });
    });

    describe("NFT Minting", function () {
        it("Should mint an access pass with correct fee", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            const mintFee = await guestBook.mintFee();

            await expect(
                guestBook.connect(user1).mint({ value: mintFee })
            ).to.emit(guestBook, "PassMinted")
                .withArgs(user1.address, 0);

            expect(await guestBook.balanceOf(user1.address)).to.equal(1);
        });

        it("Should fail to mint without sufficient fee", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            const insufficientFee = ethers.parseEther("0.005");

            await expect(
                guestBook.connect(user1).mint({ value: insufficientFee })
            ).to.be.revertedWith("Insufficient mint fee");
        });

        it("Should prevent minting multiple passes", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            const mintFee = await guestBook.mintFee();

            await guestBook.connect(user1).mint({ value: mintFee });

            await expect(
                guestBook.connect(user1).mint({ value: mintFee })
            ).to.be.revertedWith("Already own a pass");
        });

        it("Should increment token IDs correctly", async function () {
            const { guestBook, user1, user2 } = await loadFixture(deployGuestBookFixture);
            const mintFee = await guestBook.mintFee();

            await guestBook.connect(user1).mint({ value: mintFee });
            await guestBook.connect(user2).mint({ value: mintFee });

            expect(await guestBook.ownerOf(0)).to.equal(user1.address);
            expect(await guestBook.ownerOf(1)).to.equal(user2.address);
        });
    });

    describe("Guestbook Messages", function () {
        async function mintPassForUser(guestBook, user) {
            const mintFee = await guestBook.mintFee();
            await guestBook.connect(user).mint({ value: mintFee });
        }

        it("Should post a message with valid inputs", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            await mintPassForUser(guestBook, user1);

            const messageFee = await guestBook.messageFee();
            const name = "Alice";
            const message = "Hello, blockchain!";

            await expect(
                guestBook.connect(user1).postMessage(name, message, { value: messageFee })
            ).to.emit(guestBook, "NewMessage")
                .withArgs(user1.address, name, message);

            const messages = await guestBook.getAllMessages();
            expect(messages.length).to.equal(1);
            expect(messages[0].name).to.equal(name);
            expect(messages[0].message).to.equal(message);
            expect(messages[0].sender).to.equal(user1.address);
        });

        it("Should fail to post without access pass", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            const messageFee = await guestBook.messageFee();

            await expect(
                guestBook.connect(user1).postMessage("Alice", "Hello", { value: messageFee })
            ).to.be.revertedWith("Must own Access Pass to post");
        });

        it("Should fail to post without sufficient fee", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            await mintPassForUser(guestBook, user1);

            await expect(
                guestBook.connect(user1).postMessage("Alice", "Hello", { value: 0 })
            ).to.be.revertedWith("Insufficient message fee");
        });

        it("Should reject empty name", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            await mintPassForUser(guestBook, user1);
            const messageFee = await guestBook.messageFee();

            await expect(
                guestBook.connect(user1).postMessage("", "Hello", { value: messageFee })
            ).to.be.revertedWith("Name cannot be empty");
        });

        it("Should reject empty message", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            await mintPassForUser(guestBook, user1);
            const messageFee = await guestBook.messageFee();

            await expect(
                guestBook.connect(user1).postMessage("Alice", "", { value: messageFee })
            ).to.be.revertedWith("Message cannot be empty");
        });

        it("Should reject name exceeding max length", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            await mintPassForUser(guestBook, user1);
            const messageFee = await guestBook.messageFee();
            const longName = "a".repeat(51);

            await expect(
                guestBook.connect(user1).postMessage(longName, "Hello", { value: messageFee })
            ).to.be.revertedWith("Name too long");
        });

        it("Should reject message exceeding max length", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            await mintPassForUser(guestBook, user1);
            const messageFee = await guestBook.messageFee();
            const longMessage = "a".repeat(281);

            await expect(
                guestBook.connect(user1).postMessage("Alice", longMessage, { value: messageFee })
            ).to.be.revertedWith("Message too long");
        });
    });

    describe("Todo List", function () {
        it("Should create a todo with correct fee", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            const todoFee = await guestBook.todoCreationFee();

            await expect(
                guestBook.connect(user1).createTodo("Buy milk", "Get 2% milk", { value: todoFee })
            ).to.emit(guestBook, "TodoCreated")
                .withArgs(0, user1.address, "Buy milk");

            const todos = await guestBook.getAllTodos();
            expect(todos.length).to.equal(1);
            expect(todos[0].title).to.equal("Buy milk");
            expect(todos[0].description).to.equal("Get 2% milk");
            expect(todos[0].creator).to.equal(user1.address);
            expect(todos[0].completed).to.be.false;
            expect(todos[0].likes).to.equal(0);
        });

        it("Should toggle todo completion (creator only)", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            const todoFee = await guestBook.todoCreationFee();

            await guestBook.connect(user1).createTodo("Buy milk", "Description", { value: todoFee });

            await expect(
                guestBook.connect(user1).toggleTodoComplete(0)
            ).to.emit(guestBook, "TodoCompleted")
                .withArgs(0, true);

            const todos = await guestBook.getAllTodos();
            expect(todos[0].completed).to.be.true;
        });

        it("Should like and unlike a todo", async function () {
            const { guestBook, user1, user2 } = await loadFixture(deployGuestBookFixture);
            const todoFee = await guestBook.todoCreationFee();

            await guestBook.connect(user1).createTodo("Buy milk", "Description", { value: todoFee });

            await expect(
                guestBook.connect(user2).likeTodo(0)
            ).to.emit(guestBook, "TodoLiked")
                .withArgs(0, user2.address, true);

            let todos = await guestBook.getAllTodos();
            expect(todos[0].likes).to.equal(1);

            await expect(
                guestBook.connect(user2).unlikeTodo(0)
            ).to.emit(guestBook, "TodoLiked")
                .withArgs(0, user2.address, false);

            todos = await guestBook.getAllTodos();
            expect(todos[0].likes).to.equal(0);
        });
    });

    describe("Fee Management", function () {
        it("Should allow owner to update fees", async function () {
            const { guestBook, owner } = await loadFixture(deployGuestBookFixture);
            const newFee = ethers.parseEther("0.02");

            await expect(
                guestBook.connect(owner).updateMintFee(newFee)
            ).to.emit(guestBook, "FeeUpdated")
                .withArgs("mint", newFee);

            expect(await guestBook.mintFee()).to.equal(newFee);
        });

        it("Should prevent non-owner from updating fees", async function () {
            const { guestBook, user1 } = await loadFixture(deployGuestBookFixture);
            const newFee = ethers.parseEther("0.02");

            await expect(
                guestBook.connect(user1).updateMintFee(newFee)
            ).to.be.revertedWithCustomError(guestBook, "OwnableUnauthorizedAccount");
        });
    });

    describe("Withdrawal", function () {
        it("Should allow owner to withdraw funds", async function () {
            const { guestBook, owner, user1 } = await loadFixture(deployGuestBookFixture);
            const mintFee = await guestBook.mintFee();

            await guestBook.connect(user1).mint({ value: mintFee });

            const contractBalance = await ethers.provider.getBalance(guestBook.target);

            await expect(
                guestBook.connect(owner).withdraw()
            ).to.emit(guestBook, "Withdrawal")
                .withArgs(owner.address, contractBalance);

            expect(await ethers.provider.getBalance(guestBook.target)).to.equal(0);
        });

        it("Should fail to withdraw with no balance", async function () {
            const { guestBook, owner } = await loadFixture(deployGuestBookFixture);

            await expect(
                guestBook.connect(owner).withdraw()
            ).to.be.revertedWith("No funds to withdraw");
        });

        it("Should prevent non-owner from withdrawing", async function () {
            const { guestBook, user1, user2 } = await loadFixture(deployGuestBookFixture);
            const mintFee = await guestBook.mintFee();

            await guestBook.connect(user1).mint({ value: mintFee });

            await expect(
                guestBook.connect(user2).withdraw()
            ).to.be.revertedWithCustomError(guestBook, "OwnableUnauthorizedAccount");
        });
    });
});
