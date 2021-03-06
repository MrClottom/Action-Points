const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')

const ActionPoints = artifacts.require('ActionPoints')

contract('ActionPoints', ([main1, user1, user2, user3, attacker1, attacker2]) => {
  beforeEach(async () => {
    this.apToken = await ActionPoints.new({ from: main1 })
  })

  describe('deploy conditions', () => {
    it('has correct owner', async () => {
      expect(await this.apToken.owner()).to.equal(main1, 'wrong owner')
    })
    it('has no initial supply', async () => {
      expect(await this.apToken.totalSupply()).to.be.bignumber.equal(new BN('0'))
    })
  })

  describe('minting', () => {
    it('allows owner to directly mint', async () => {
      const user1BalBefore = await this.apToken.balanceOf(user1)

      expect(user1BalBefore).to.be.bignumber.equal(new BN('0'), 'initial balance should be zero')

      const mintAmount = web3.utils.toWei('5.4')
      expectEvent(await this.apToken.directMint(user1, mintAmount, { from: main1 }), 'Transfer', {
        from: '0x'.concat('00'.repeat(20)),
        to: user1,
        value: mintAmount
      })

      const user1BalAfter = await this.apToken.balanceOf(user1)

      expect(user1BalAfter.sub(user1BalBefore)).to.be.bignumber.equal(
        mintAmount,
        'Wrong amount received'
      )
    })

    it('prevents non-owners from minting', async () => {
      expect(await this.apToken.owner()).to.not.equal(attacker1, 'Wrong starting owner')

      const mintAmount = web3.utils.toWei('1000')
      await expectRevert(
        this.apToken.directMint(attacker2, mintAmount, { from: attacker1 }),
        'Ownable: caller is not the owner'
      )
    })
  })

  describe('basic token functions', () => {
    it('can transfer', async () => {
      const mintAmount = web3.utils.toWei('8')
      await this.apToken.directMint(user1, mintAmount, { from: main1 })

      const user1BalBefore = await this.apToken.balanceOf(user1)
      const user2BalBefore = await this.apToken.balanceOf(user2)

      const amountToSend = web3.utils.toWei('5')

      expectEvent(await this.apToken.transfer(user2, amountToSend, { from: user1 }), 'Transfer', {
        from: user1,
        to: user2,
        value: amountToSend
      })

      const user1BalAfter = await this.apToken.balanceOf(user1)
      const user2BalAfter = await this.apToken.balanceOf(user2)

      expect(user1BalBefore.sub(user1BalAfter)).to.be.bignumber.equal(
        amountToSend,
        'invalid amount deducted'
      )
      expect(user2BalAfter.sub(user2BalBefore)).to.be.bignumber.equal(
        amountToSend,
        'invalid amount received'
      )
    })

    it('can transfer using allowance', async () => {
      const mintAmount = new BN(web3.utils.toWei('8'))
      await this.apToken.directMint(user1, mintAmount, { from: main1 })
      expect(await this.apToken.balanceOf(user1)).to.be.bignumber.equal(mintAmount)

      const transferAmount = new BN(web3.utils.toWei('3'))

      expectEvent(await this.apToken.approve(user2, transferAmount, { from: user1 }), 'Approval', {
        owner: user1,
        spender: user2,
        value: transferAmount
      })

      expect(await this.apToken.balanceOf(user3)).to.be.bignumber.equal(new BN('0'))

      expectEvent(
        await this.apToken.transferFrom(user1, user3, transferAmount, { from: user2 }),
        'Transfer',
        {
          from: user1,
          to: user3,
          value: transferAmount
        }
      )

      expect(await this.apToken.balanceOf(user3)).to.be.bignumber.equal(
        transferAmount,
        'User did not receive tokens'
      )

      expect(await this.apToken.balanceOf(user1)).to.be.bignumber.equal(
        mintAmount.sub(transferAmount),
        'tokens deducted incorrectly'
      )
    })
  })

  describe('allocating tokens', () => {
    it('only owner can allocate new supply', async () => {
      const supplyToAllocate = new BN(web3.utils.toWei('43'))
      expectEvent(
        await this.apToken.allocateCoins(supplyToAllocate, { from: main1 }),
        'APTokensAllocated',
        { currentlyAllocated: supplyToAllocate }
      )

      const maliciousAllocAmount = new BN(web3.utils.toWei('10000'))
      await expectRevert(
        this.apToken.allocateCoins(maliciousAllocAmount, { from: attacker1 }),
        'Ownable: caller is not the owner'
      )
    })
  })
})
