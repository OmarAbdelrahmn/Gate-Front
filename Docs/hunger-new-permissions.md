# صلاحيات هنقر والمكونات المشتركة

تضاف التعريفات إلى Application والمنح إلى Identity بترحيلين منفصلين. المنح الجديدة الافتراضية لدور SYSTEM_ADMIN فقط؛ لا تنسخ صلاحية التعديل القديمة تلقائيًا إلى بقية الأدوار. تحقق الصلاحية يتم في controller والخدمة على نطاق منصة العميل، ويعاد عند الاعتماد.

| المفتاح | الاستخدام |
|---|---|
| `hunger.read` | الحسابات والملخص وتقارير التشغيل والجودة |
| `hunger.accounts.import` | معاينة واعتماد ملف التأسيس |
| `hunger.accounts.update` | تغيير التصنيف التشغيلي وبيانات الاستخدام المشتركة |
| `hunger.quality.import` | القالب والمعاينة والاعتماد ونتيجة الجودة وإعادة التخصيص |
| `hunger.quality.export` | تصدير الجودة؛ يحتاج أيضًا hunger.read |
| `hunger.performance.import` | استيراد التشغيل والمقارنة اليدوية |
| `hunger.performance.export` | تصدير التشغيل؛ يحتاج أيضًا hunger.read |
| `hunger.alerts.manage` | إضافة قواعد متابعة مؤرخة |
| `hunger.finance.manage` | التمويل والشحن والتحصيل والمحفظة وأدلة التسويات |
| `hunger.finance.configure` | اعتماد الربط المحاسبي؛ صلاحية عالية الثقة |
| `hunger.remittances.confirm` | تأكيد المحاسب للاستلام الفعلي |
| `platform_accounts.fields.identity` | هوية الحساب ورقم معرفه واسمه ومنصته |
| `platform_accounts.fields.owner` | ربط صاحب الحساب |
| `platform_accounts.fields.city` | مدينة الحساب |
| `platform_accounts.fields.registry` | بيانات جهة/سجل التسجيل |
| `platform_accounts.fields.contact` | هاتف الحساب وربطه بالشريحة |
| `platform_accounts.fields.registered_vehicle` | المركبة المسجلة، مستقلًا عن الحركة |
| `platform_accounts.fields.settlement` | نظام تسوية المعرف |
| `platform_assignments.fields.compensation` | Commission/Target/Unknown مستقلًا عن PaymentModel |
| `platform_accounts.credentials.reveal` | الإفصاح الفعلي عن السر دون منحه من قراءة السجل |

استيراد التأسيس يحتاج إضافة إلى `hunger.accounts.import` صلاحيات owner/city/contact/registry/settlement/registered_vehicle. المسارات المشتركة تحت platform-accounts تحتفظ بصلاحياتها العامة القائمة، وتضيف فحص مجموعة الحقول المتغيرة. تغيير كلمة المرور يبقى بصلاحية `platform_credentials.rotate` القائمة، ولا يمنح القراءة.

**توضيح المستخدم الأخير:** السالب والموجب طبيعيان بمحفظة هنقر عند التسليم والاستلام؛ لا توجد صلاحية استثناء أو منع مبني على الإشارة وحدها. هذا التوضيح يستبدل القاعدة الأقدم في حزمة 2.1.

كل المفاتيح الجديدة ذات نطاق ClientPlatform، وصلاحيات بيانات حساسة. تحقق التزامن يعتمد rowVersion، ومعاينة الاستيراد مرتبطة بالمنفذ ومحتوى المصدر ونسخة البيانات؛ عرض زر في الواجهة ليس بديلًا عن التحقق الخادمي.
