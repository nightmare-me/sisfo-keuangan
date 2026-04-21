"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var client_1 = require("@prisma/client");
var adapter_pg_1 = require("@prisma/adapter-pg");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
}
var prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({ connectionString: connectionString }),
});
function ensureRoles() {
    return __awaiter(this, void 0, void 0, function () {
        var roles;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all(["admin", "cs", "pengajar", "finance"].map(function (slug) {
                        return prisma.role.upsert({
                            where: { slug: slug },
                            update: {},
                            create: {
                                name: slug.toUpperCase(),
                                slug: slug,
                                description: "Auto-generated role for ".concat(slug),
                            },
                        });
                    }))];
                case 1:
                    roles = _a.sent();
                    return [2 /*return*/, Object.fromEntries(roles.map(function (role) { return [role.slug, role]; }))];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var roleMap, adminPassword, admin, csPassword, cs1, cs2, pgPassword, pg1, pg2, kasirPw, kasir, programs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Seeding database Speaking Partner by Kampung Inggris...");
                    return [4 /*yield*/, ensureRoles()];
                case 1:
                    roleMap = _a.sent();
                    return [4 /*yield*/, bcryptjs_1.default.hash("admin123", 12)];
                case 2:
                    adminPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "admin@speakingpartner.id" },
                            update: { roleId: roleMap.admin.id },
                            create: {
                                name: "Administrator",
                                email: "admin@speakingpartner.id",
                                password: adminPassword,
                                roleId: roleMap.admin.id,
                            },
                        })];
                case 3:
                    admin = _a.sent();
                    console.log("Admin:", admin.email);
                    return [4 /*yield*/, bcryptjs_1.default.hash("cs123456", 12)];
                case 4:
                    csPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "rizky@speakingpartner.id" },
                            update: { roleId: roleMap.cs.id },
                            create: {
                                name: "Rizky Pratama",
                                email: "rizky@speakingpartner.id",
                                password: csPassword,
                                roleId: roleMap.cs.id,
                            },
                        })];
                case 5:
                    cs1 = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "sari@speakingpartner.id" },
                            update: { roleId: roleMap.cs.id },
                            create: {
                                name: "Sari Dewi",
                                email: "sari@speakingpartner.id",
                                password: csPassword,
                                roleId: roleMap.cs.id,
                            },
                        })];
                case 6:
                    cs2 = _a.sent();
                    console.log("CS users:", cs1.name, ",", cs2.name);
                    return [4 /*yield*/, bcryptjs_1.default.hash("pengajar123", 12)];
                case 7:
                    pgPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "budi@speakingpartner.id" },
                            update: { roleId: roleMap.pengajar.id },
                            create: {
                                name: "Budi Santoso",
                                email: "budi@speakingpartner.id",
                                password: pgPassword,
                                roleId: roleMap.pengajar.id,
                            },
                        })];
                case 8:
                    pg1 = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "nina@speakingpartner.id" },
                            update: { roleId: roleMap.pengajar.id },
                            create: {
                                name: "Nina Rahayu",
                                email: "nina@speakingpartner.id",
                                password: pgPassword,
                                roleId: roleMap.pengajar.id,
                            },
                        })];
                case 9:
                    pg2 = _a.sent();
                    console.log("Pengajar:", pg1.name, ",", pg2.name);
                    return [4 /*yield*/, bcryptjs_1.default.hash("kasir123", 12)];
                case 10:
                    kasirPw = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: "kasir@speakingpartner.id" },
                            update: { roleId: roleMap.finance.id },
                            create: {
                                name: "Dina Kasir",
                                email: "kasir@speakingpartner.id",
                                password: kasirPw,
                                roleId: roleMap.finance.id,
                            },
                        })];
                case 11:
                    kasir = _a.sent();
                    console.log("Kasir:", kasir.email);
                    return [4 /*yield*/, Promise.all([
                            prisma.program.upsert({
                                where: { id: "prog-speaking-regular" },
                                update: {},
                                create: { id: "prog-speaking-regular", nama: "Speaking Regular", deskripsi: "Kelas speaking bahasa Inggris regular", tipe: "REGULAR", harga: 1500000, durasiBuilan: 1 },
                            }),
                            prisma.program.upsert({
                                where: { id: "prog-speaking-private" },
                                update: {},
                                create: { id: "prog-speaking-private", nama: "Speaking Private", deskripsi: "Kelas speaking 1-on-1 dengan native tutor", tipe: "PRIVATE", harga: 3000000, durasiBuilan: 1 },
                            }),
                            prisma.program.upsert({
                                where: { id: "prog-speaking-semi" },
                                update: {},
                                create: { id: "prog-speaking-semi", nama: "Speaking Semi-Private", deskripsi: "Kelas speaking 2-4 orang", tipe: "SEMI_PRIVATE", harga: 2000000, durasiBuilan: 1 },
                            }),
                            prisma.program.upsert({
                                where: { id: "prog-grammar" },
                                update: {},
                                create: { id: "prog-grammar", nama: "Grammar Intensive", deskripsi: "Kelas grammar intensif untuk semua level", tipe: "REGULAR", harga: 1200000, durasiBuilan: 1 },
                            }),
                            prisma.program.upsert({
                                where: { id: "prog-toefl" },
                                update: {},
                                create: { id: "prog-toefl", nama: "TOEFL Preparation", deskripsi: "Persiapan ujian TOEFL/IELTS", tipe: "REGULAR", harga: 2500000, durasiBuilan: 2 },
                            }),
                        ])];
                case 12:
                    programs = _a.sent();
                    console.log("Programs:", programs.map(function (program) { return program.nama; }).join(", "));
                    return [4 /*yield*/, prisma.tarifPengajar.upsert({
                            where: { id: "tarif-regular" },
                            update: {},
                            create: { id: "tarif-regular", tipeKelas: "REGULAR", tarif: 75000, keterangan: "Tarif standar kelas regular" },
                        })];
                case 13:
                    _a.sent();
                    return [4 /*yield*/, prisma.tarifPengajar.upsert({
                            where: { id: "tarif-private" },
                            update: {},
                            create: { id: "tarif-private", tipeKelas: "PRIVATE", tarif: 150000, keterangan: "Tarif kelas private 1-on-1" },
                        })];
                case 14:
                    _a.sent();
                    return [4 /*yield*/, prisma.tarifPengajar.upsert({
                            where: { id: "tarif-semi" },
                            update: {},
                            create: { id: "tarif-semi", tipeKelas: "SEMI_PRIVATE", tarif: 100000, keterangan: "Tarif kelas semi-private" },
                        })];
                case 15:
                    _a.sent();
                    console.log("Tarif pengajar selesai");
                    return [4 /*yield*/, prisma.inventaris.createMany({
                            skipDuplicates: true,
                            data: [
                                { nama: "Whiteboard Besar", kategori: "Peralatan", jumlah: 5, satuan: "pcs", hargaBeli: 500000, kondisi: "BAIK", stokMinimum: 2 },
                                { nama: "Spidol Whiteboard", kategori: "ATK", jumlah: 20, satuan: "pcs", hargaBeli: 15000, kondisi: "BAIK", stokMinimum: 10 },
                                { nama: "Kursi Kelas", kategori: "Furnitur", jumlah: 40, satuan: "unit", hargaBeli: 250000, kondisi: "BAIK", stokMinimum: 30 },
                                { nama: "Meja Belajar", kategori: "Furnitur", jumlah: 20, satuan: "unit", hargaBeli: 400000, kondisi: "BAIK", stokMinimum: 15 },
                                { nama: "Proyektor", kategori: "Elektronik", jumlah: 3, satuan: "unit", hargaBeli: 5000000, kondisi: "BAIK", stokMinimum: 2 },
                                { nama: "Kertas A4", kategori: "ATK", jumlah: 5, satuan: "rim", hargaBeli: 50000, kondisi: "BAIK", stokMinimum: 3 },
                            ],
                        })];
                case 16:
                    _a.sent();
                    console.log("Inventaris contoh ditambahkan");
                    console.log("\nSeed selesai!");
                    console.log("=============================================");
                    console.log("AKUN LOGIN:");
                    console.log("  Admin    -> admin@speakingpartner.id  / admin123");
                    console.log("  Kasir    -> kasir@speakingpartner.id  / kasir123");
                    console.log("  CS       -> rizky@speakingpartner.id  / cs123456");
                    console.log("  CS       -> sari@speakingpartner.id   / cs123456");
                    console.log("  Pengajar -> budi@speakingpartner.id   / pengajar123");
                    console.log("=============================================");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (error) {
    console.error(error);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
