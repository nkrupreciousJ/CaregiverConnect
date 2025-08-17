 
import { describe, it, expect, beforeEach } from "vitest";

interface Profile {
	name: string;
	bio: Uint8Array;
	experienceYears: bigint;
	certifications: string[];
	isAvailable: boolean;
	reputationScore: bigint;
	reviewCount: bigint;
	isVerified: boolean;
	lastUpdated: bigint;
}

const mockContract = {
	admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" as string,
	paused: false as boolean,
	reputationUpdater: null as string | null,
	profiles: new Map<string, Profile>(),
	MAX_CERTIFICATIONS: 10n,

	isAdmin(caller: string): boolean {
		return caller === this.admin;
	},

	setPaused(
		caller: string,
		pause: boolean
	): { value: boolean } | { error: number } {
		if (!this.isAdmin(caller)) return { error: 100 };
		this.paused = pause;
		return { value: pause };
	},

	setReputationUpdater(
		caller: string,
		updater: string | null
	): { value: boolean } | { error: number } {
		if (!this.isAdmin(caller)) return { error: 100 };
		this.reputationUpdater = updater;
		return { value: true };
	},

	registerProfile(
		caller: string,
		name: string,
		bio: Uint8Array,
		experienceYears: bigint,
		certifications: string[],
		isAvailable: boolean
	): { value: boolean } | { error: number } {
		if (this.paused) return { error: 107 };
		if (this.profiles.has(caller)) return { error: 101 };
		if (name.length > 50) return { error: 103 };
		if (bio.length > 500) return { error: 103 };
		if (certifications.length > Number(this.MAX_CERTIFICATIONS))
			return { error: 106 };
		this.profiles.set(caller, {
			name,
			bio,
			experienceYears,
			certifications,
			isAvailable,
			reputationScore: 0n,
			reviewCount: 0n,
			isVerified: false,
			lastUpdated: 100n, // mock block height
		});
		return { value: true };
	},

	updateProfile(
		caller: string,
		name?: string,
		bio?: Uint8Array,
		experienceYears?: bigint,
		isAvailable?: boolean
	): { value: boolean } | { error: number } {
		if (this.paused) return { error: 107 };
		const profile = this.profiles.get(caller);
		if (!profile) return { error: 102 };
		if (name && name.length > 50) return { error: 103 };
		if (bio && bio.length > 500) return { error: 103 };
		const updatedProfile: Profile = {
			...profile,
			name: name ?? profile.name,
			bio: bio ?? profile.bio,
			experienceYears: experienceYears ?? profile.experienceYears,
			isAvailable: isAvailable ?? profile.isAvailable,
			lastUpdated: 101n, // updated
		};
		this.profiles.set(caller, updatedProfile);
		return { value: true };
	},

	addCertification(
		caller: string,
		cert: string
	): { value: boolean } | { error: number } {
		if (this.paused) return { error: 107 };
		const profile = this.profiles.get(caller);
		if (!profile) return { error: 102 };
		if (cert.length > 100) return { error: 103 };
		if (profile.certifications.length >= Number(this.MAX_CERTIFICATIONS))
			return { error: 106 };
		profile.certifications.push(cert);
		return { value: true };
	},

	removeCertification(
		caller: string,
		index: bigint
	): { value: boolean } | { error: number } {
		if (this.paused) return { error: 107 };
		const profile = this.profiles.get(caller);
		if (!profile) return { error: 102 };
		const idx = Number(index);
		if (idx >= profile.certifications.length || idx < 0) return { error: 103 };
		profile.certifications.splice(idx, 1);
		return { value: true };
	},

	verifyProfile(
		caller: string,
		caregiver: string
	): { value: boolean } | { error: number } {
		if (!this.isAdmin(caller)) return { error: 100 };
		const profile = this.profiles.get(caregiver);
		if (!profile) return { error: 102 };
		if (profile.isVerified) return { error: 105 };
		profile.isVerified = true;
		return { value: true };
	},

	updateReputation(
		caller: string,
		caregiver: string,
		scoreAdd: bigint,
		reviewAdd: bigint
	): { value: boolean } | { error: number } {
		if (this.paused) return { error: 107 };
		if (this.reputationUpdater && caller !== this.reputationUpdater)
			return { error: 100 };
		if (scoreAdd <= 0n) return { error: 109 };
		const profile = this.profiles.get(caregiver);
		if (!profile) return { error: 102 };
		if (!profile.isVerified) return { error: 104 };
		profile.reputationScore += scoreAdd;
		profile.reviewCount += reviewAdd;
		return { value: true };
	},
};

describe("CaregiverProfile Contract", () => {
	beforeEach(() => {
		mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
		mockContract.paused = false;
		mockContract.reputationUpdater = null;
		mockContract.profiles = new Map();
	});

	it("should register a new profile successfully", () => {
		const result = mockContract.registerProfile(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"John Doe",
			new Uint8Array([
				/* bio bytes */
			]),
			5n,
			["Cert1", "Cert2"],
			true
		);
		expect(result).toEqual({ value: true });
		expect(
			mockContract.profiles.has("ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8")
		).toBe(true);
	});

	it("should prevent registering duplicate profile", () => {
		mockContract.registerProfile(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"John Doe",
			new Uint8Array(),
			5n,
			[],
			true
		);
		const result = mockContract.registerProfile(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"Jane Doe",
			new Uint8Array(),
			3n,
			[],
			false
		);
		expect(result).toEqual({ error: 101 });
	});

	it("should update profile details", () => {
		mockContract.registerProfile(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"John Doe",
			new Uint8Array(),
			5n,
			[],
			true
		);
		const result = mockContract.updateProfile(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"Updated Name",
			undefined,
			10n,
			false
		);
		expect(result).toEqual({ value: true });
		const profile = mockContract.profiles.get(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8"
		);
		expect(profile?.name).toBe("Updated Name");
		expect(profile?.experienceYears).toBe(10n);
		expect(profile?.isAvailable).toBe(false);
	});

	it("should add certification", () => {
		mockContract.registerProfile(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"John Doe",
			new Uint8Array(),
			5n,
			[],
			true
		);
		const result = mockContract.addCertification(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"New Cert"
		);
		expect(result).toEqual({ value: true });
		const profile = mockContract.profiles.get(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8"
		);
		expect(profile?.certifications).toContain("New Cert");
	});

	it("should remove certification", () => {
		mockContract.registerProfile(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"John Doe",
			new Uint8Array(),
			5n,
			["Cert1", "Cert2"],
			true
		);
		const result = mockContract.removeCertification(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			1n
		);
		expect(result).toEqual({ value: true });
		const profile = mockContract.profiles.get(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8"
		);
		expect(profile?.certifications).toEqual(["Cert1"]);
	});

	it("should verify profile by admin", () => {
		mockContract.registerProfile(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"John Doe",
			new Uint8Array(),
			5n,
			[],
			true
		);
		const result = mockContract.verifyProfile(
			mockContract.admin,
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8"
		);
		expect(result).toEqual({ value: true });
		const profile = mockContract.profiles.get(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8"
		);
		expect(profile?.isVerified).toBe(true);
	});

	it("should update reputation by authorized caller", () => {
		mockContract.registerProfile(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"John Doe",
			new Uint8Array(),
			5n,
			[],
			true
		);
		mockContract.verifyProfile(
			mockContract.admin,
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8"
		);
		const result = mockContract.updateReputation(
			"SomeCaller",
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			10n,
			1n
		);
		expect(result).toEqual({ value: true });
		const profile = mockContract.profiles.get(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8"
		);
		expect(profile?.reputationScore).toBe(10n);
		expect(profile?.reviewCount).toBe(1n);
	});

	it("should prevent reputation update if not verified", () => {
		mockContract.registerProfile(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"John Doe",
			new Uint8Array(),
			5n,
			[],
			true
		);
		const result = mockContract.updateReputation(
			"SomeCaller",
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			10n,
			1n
		);
		expect(result).toEqual({ error: 104 });
	});

	it("should prevent actions when paused", () => {
		mockContract.setPaused(mockContract.admin, true);
		const result = mockContract.registerProfile(
			"ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6RF0A4BK8",
			"John Doe",
			new Uint8Array(),
			5n,
			[],
			true
		);
		expect(result).toEqual({ error: 107 });
	});
});