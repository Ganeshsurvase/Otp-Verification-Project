import { LightningElement, track } from 'lwc';
import sendOtpMethod from '@salesforce/apex/OTPController.sendOtp';
import verifyOtpMethod from '@salesforce/apex/OTPController.verifyOtp';
import createAccountMethod from '@salesforce/apex/OTPController.createAccount';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class EmailOtpAccount extends LightningElement {
    @track step = 1;

    // Step 1
    @track email = '';

    // Step 2
    @track otpCode = '';

    // Step 3
    @track accountName = '';
    @track industry = '';
    @track industryOptions = [
        { label: 'Finance', value: 'Finance' },
        { label: 'Technology', value: 'Technology' },
        { label: 'Healthcare', value: 'Healthcare' },
        { label: 'Education', value: 'Education' }
    ];

    // Progress indicator mapping
    get currentStep() {
        if (this.step === 1) return "1";   // Upload → Enter Email
        if (this.step === 2) return "2";   // Preview → Verify OTP
        if (this.step === 3) return "3";   // Mapping → Create Account
        return "4";                        // Save → After Account Created
    }

    get isStep1() { return this.step === 1; }
    get isStep2() { return this.step === 2; }
    get isStep3() { return this.step === 3; }

    // Step 1: Send OTP
    handleEmailChange(event) { this.email = event.target.value; }

    handleSendOtp() {
        if (!this.email) {
            this.showToast('Error', 'Please enter email', 'error');
            return;
        }
        sendOtpMethod({ email: this.email })
            .then(result => {
                if (result) {
                    this.showToast('Success', 'OTP Sent Successfully', 'success');
                    this.step = 2;
                } else {
                    this.showToast('Error', 'Failed to send OTP', 'error');
                }
            })
            .catch(error => 
                this.showToast('Error', error.body ? error.body.message : error.message, 'error')
            );
    }

    // Step 2: Verify OTP
    handleOtpChange(event) { this.otpCode = event.target.value; }

    handleVerifyOtp() {
        if (!this.otpCode) {
            this.showToast('Error', 'Enter OTP', 'error');
            return;
        }
        verifyOtpMethod({ email: this.email, otp: this.otpCode })
            .then(result => {
                if (result) {
                    this.showToast('Success', 'OTP Verified', 'success');
                    this.step = 3;
                } else {
                    this.showToast('Error', 'Invalid OTP', 'error');
                }
            })
            .catch(error => 
                this.showToast('Error', error.body ? error.body.message : error.message, 'error')
            );
    }

    handleResendOtp() {
        sendOtpMethod({ email: this.email })
            .then(result => { 
                if (result) this.showToast('Success', 'OTP Resent Successfully', 'success'); 
            })
            .catch(error => 
                this.showToast('Error', error.body ? error.body.message : error.message, 'error')
            );
    }

    // Step 3: Create Account
    handleAccountNameChange(event) { this.accountName = event.target.value; }
    handleIndustryChange(event) { this.industry = event.target.value; }

    handleCreateAccount() {
        if (!this.accountName || !this.industry) {
            this.showToast('Error', 'Enter account details', 'error');
            return;
        }
        createAccountMethod({ name: this.accountName, industry: this.industry })
            .then(result => {
                this.showToast('Success', 'Account Created Successfully', 'success');
                this.step = 4; // Move progress to "Save"
                this.resetFlow();
            })
            .catch(error => 
                this.showToast('Error', error.body ? error.body.message : error.message, 'error')
            );
    }

    resetFlow() {
        this.step = 1;
        this.email = '';
        this.otpCode = '';
        this.accountName = '';
        this.industry = '';
    }

    // Toast helper
    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
