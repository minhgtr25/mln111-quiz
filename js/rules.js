/* ==========================================================
           1. 10 CORE RULES DEFINITION & SMART CLASSIFIER
           ========================================================== */
        const RULES_CONFIG = [
            {
                id: "rule_phap_bien_chung_3_quy_luat",
                title: "3 Quy luật biện chứng (Nguồn gốc - Cách thức - Khuynh hướng)",
                tag: "3 Quy luật cốt lõi",
                icon: "⚖️",
                formula: "Nguồn gốc/Động lực ➔ Mâu thuẫn | Cách thức/Hình thức ➔ Lượng - Chất | Khuynh hướng kế thừa/Đi lên ➔ Phủ định của phủ định",
                matcher: (q, ans) => {
                    const text = (q.q + " " + ans).toLowerCase();
                    return text.includes("mâu thuẫn") || text.includes("lượng") || text.includes("chất") || text.includes("phủ định của phủ định");
                }
            },
            {
                id: "rule_llsx_qhsx",
                title: "Lực lượng sản xuất (LLSX) & Quan hệ sản xuất (QHSX)",
                tag: "Kinh tế & Xã hội",
                icon: "⚙️",
                formula: "Cách mạng/động nhất ➔ Công cụ LĐ | Quyết định nhất/chủ thể ➔ Người LĐ | Nội dung ➔ LLSX, Hình thức ➔ QHSX | QHSX tác động ➔ Thúc đẩy hoặc kìm hãm",
                matcher: (q, ans) => {
                    const text = (q.q + " " + ans).toLowerCase();
                    return text.includes("lực lượng sản xuất") || text.includes("quan hệ sản xuất") || text.includes("công cụ lao động") || text.includes("người lao động") || text.includes("tư liệu sản xuất");
                }
            },
            {
                id: "rule_vat_chat_y_thuc",
                title: "Vật chất, Ý thức & Tiêu chuẩn Chân lý",
                tag: "Bản thể & Nhận thức",
                icon: "💡",
                formula: "Vật chất ➔ Thực tại khách quan (Lênin) | Ý thức ➔ Hình ảnh chủ quan của thế giới khách quan | Cơ sở/Động lực/Mục đích/Tiêu chuẩn chân lý ➔ Thực tiễn",
                matcher: (q, ans) => {
                    const text = (q.q + " " + ans).toLowerCase();
                    return text.includes("vật chất") || text.includes("ý thức") || text.includes("thực tiễn") || text.includes("chân lý") || text.includes("nhận thức");
                }
            },
            {
                id: "rule_csht_kttt",
                title: "Tồn tại XH - Ý thức XH & Cơ sở hạ tầng - Kiến trúc thượng tầng",
                tag: "Duy vật lịch sử",
                icon: "🏛️",
                formula: "Tồn tại XH quyết định Ý thức XH (Ý thức XH độc lập tương đối) | Cơ sở hạ tầng = Toàn bộ QHSX hợp thành cơ cấu kinh tế | KTTT = Thiết chế chính trị (Nhà nước tác động mạnh nhất)",
                matcher: (q, ans) => {
                    const text = (q.q + " " + ans).toLowerCase();
                    return text.includes("tồn tại xã hội") || text.includes("ý thức xã hội") || text.includes("cơ sở hạ tầng") || text.includes("kiến trúc thượng tầng") || text.includes("hình thái kinh tế");
                }
            },
            {
                id: "rule_cap_pham_tru",
                title: "Các cặp phạm trù biện chứng (Riêng-Chung, Nhân-Quả, Tất nhiên-Ngẫu nhiên...)",
                tag: "Cặp phạm trù",
                icon: "🔄",
                formula: "Cái chung chỉ tồn tại TRONG cái riêng | Cái riêng phong phú, toàn bộ hơn | Tất nhiên do nguyên nhân bên trong quyết định | Hiện tượng là biểu hiện bên ngoài của bản chất",
                matcher: (q, ans) => {
                    const text = (q.q + " " + ans).toLowerCase();
                    return text.includes("cái riêng") || text.includes("cái chung") || text.includes("đơn nhất") || text.includes("nhân quả") || text.includes("nguyên nhân") || text.includes("tất nhiên") || text.includes("ngẫu nhiên") || text.includes("bản chất") || text.includes("hiện tượng") || text.includes("nội dung") || text.includes("hình thức");
                }
            },
            {
                id: "rule_tac_gia_triet_hoc",
                title: "Tác giả, Tác phẩm & Tiền đề lý luận",
                tag: "Nhân vật & Lịch sử triết",
                icon: "📚",
                formula: "Mác kế thừa: Phép biện chứng Hêghen + Duy vật Phoiơbắc | Lênin: 'Chủ nghĩa duy vật & chủ nghĩa kinh nghiệm phê phán' | 3 bộ phận: Triết học + KTCT + CNXHKH",
                matcher: (q, ans) => {
                    const text = (q.q + " " + ans).toLowerCase();
                    return text.includes("hêghen") || text.includes("phơ bách") || text.includes("phoiobắc") || text.includes("lênin") || text.includes("c.mác") || text.includes("ăngghen") || text.includes("tác phẩm") || text.includes("tiền đề") || text.includes("ai là người") || text.includes("nguồn gốc lý luận") || text.includes("xanh-ximông") || text.includes("thales");
                }
            },
            {
                id: "rule_giai_cap_quan_chung_lich_su",
                title: "Giai cấp, Quần chúng nhân dân & Đấu tranh xã hội",
                tag: "Chính trị - Xã hội",
                icon: "👥",
                formula: "Chủ thể chân chính sáng tạo lịch sử ➔ Quần chúng nhân dân | Nguồn gốc phân chia giai cấp ➔ Kinh tế (chế độ tư hữu) | Động lực phát triển XH có giai cấp ➔ Đấu tranh giai cấp",
                matcher: (q, ans) => {
                    const text = (q.q + " " + ans).toLowerCase();
                    return text.includes("giai cấp") || text.includes("quần chúng") || text.includes("cách mạng xã hội") || text.includes("lãnh tụ") || text.includes("sáng tạo ra lịch sử") || text.includes("nhà nước");
                }
            },
            {
                id: "rule_van_dong_khong_gian",
                title: "Vận động, Đứng im & Tính thống nhất thế giới",
                tag: "Hình thức tồn tại",
                icon: "🌀",
                formula: "Vận động là tuyệt đối, vĩnh viễn | Đứng im là tương đối, tạm thời (trong cân bằng) | 5 hình thức vận động (Cơ - Lý - Hóa - Sinh - Xã hội; Cơ học là thấp nhất)",
                matcher: (q, ans) => {
                    const text = (q.q + " " + ans).toLowerCase();
                    return text.includes("vận động") || text.includes("đứng im") || text.includes("không gian") || text.includes("thời gian") || text.includes("thống nhất vật chất");
                }
            },
            {
                id: "rule_truong_phai_triet_hoc",
                title: "Các trường phái Triết học (Duy vật - Duy tâm - Khả tri - Bất khả tri)",
                tag: "Trường phái & Vấn đề cơ bản",
                icon: "🧭",
                formula: "Vấn đề cơ bản gồm 2 mặt (Mặt 1: Bản thể luận / cái nào có trước; Mặt 2: Nhận thức luận / có nhận thức được không) | Duy tâm khách quan (Thượng đế/Ý niệm) vs Duy tâm chủ quan (Cảm giác) | Khả tri (Biết được) vs Bất khả tri (Không thể biết)",
                matcher: (q, ans) => {
                    const text = (q.q + " " + ans).toLowerCase();
                    return text.includes("duy tâm") || text.includes("duy vật") || text.includes("trường phái") || text.includes("vấn đề cơ bản") || text.includes("khả tri") || text.includes("bất khả tri") || text.includes("nhị nguyên") || text.includes("chất phác") || text.includes("kinh viện");
                }
            },
            {
                id: "rule_kinh_te_chinh_tri",
                title: "Kinh tế chính trị Mác - Lênin & Tư bản",
                tag: "Kinh tế chính trị bổ trợ",
                icon: "💰",
                formula: "Thời gian chu chuyển = Thời gian SX + Thời gian lưu thông | Thặng dư tuyệt đối = Kéo dài ngày lao động | Thặng dư tương đối = Rút ngắn thời gian lao động tất yếu nhờ tăng năng suất LĐ",
                matcher: (q, ans) => {
                    const text = (q.q + " " + ans).toLowerCase();
                    return text.includes("tư bản") || text.includes("thặng dư") || text.includes("tiền tệ") || text.includes("hàng hoá") || text.includes("hàng hóa") || text.includes("chu chuyển") || text.includes("tái sản xuất");
                }
            }
        ];
