import sqlite3
import json
import os

# Sample Data from User
data = {
    "hits": [
        {
            "detail": {
                "assignees": [
                    {
                        "userInfo": {
                            "email": "aom-39@hotmail.com",
                            "displayName": "Aom",
                            "pictureUrl": "https://profile.line-scdn.net/0hnR9qeZhtMX0UCCAr1glPAmRYMhc3eWhvPG1_HSNbP0l-P394OTx2SCMBbhp8O34tOmsqT3NfaEwYG0YbCl7NSRM4b0otPHApOmZ6nw"
                        },
                        "role": "SALESECOMMERCE",
                        "roleInfo": {
                            "roleEn": "SALESECOMMERCE",
                            "roleTh": "แผนกขาย อีคอมเมิซ เว็บSKi สีน้ำเงิน"
                        },
                        "lUId": "U598f94982660b82edc265e27ed7568ed",
                        "gUId": "01HZRAE761PM2K7Q1FQB3DDPQQ",
                        "index": "0,01HZRAE761PM2K7Q1FQB3DDPQQ",
                        "employeeNumber": "สุภมาส จันทรเกษม (อ้อม)"
                    }
                ],
                "order": {
                    "note": "",
                    "withHoldingTaxAmount": 0,
                    "netAmount": 61.55,
                    "dueDate": 1777568399999,
                    "discount": {
                        "value": None,
                        "unit": "baht"
                    },
                    "vatAmount": 4.03,
                    "taxStatus": 1,
                    "paymentType": "BILLING_CREDIT",
                    "remainingAmount": 61.55,
                    "shippingAmount": 0,
                    "preTaxAmount": 57.52,
                    "items": [
                        {
                            "available": 2,
                            "discount": {
                                "value": 0,
                                "unit": "percent",
                                "text": ""
                            },
                            "type": "SP",
                            "vatAmountWithDiscount": 4.0264,
                            "price": 30.7732,
                            "coverImage": "",
                            "preTaxAmountWithoutProductDiscount": 57.52,
                            "alias": "",
                            "id": "01HMYMR4YNDEB0E2X7Q62QBTBG",
                            "preTaxAmount": 57.52,
                            "sku": "04221-BRA-0003",
                            "preTaxAmountWithDiscount": 57.52,
                            "vatAmountWithoutProductDiscount": 4.0264,
                            "quantity": 2,
                            "withHoldingTaxAmount": 0,
                            "withHoldingTax": 0,
                            "netAmount": 61.55,
                            "netAmountWithDiscount": 61.55,
                            "purchase": {
                                "request": {
                                    "number": "PR-2026030097",
                                    "id": "01KKNFYW45YX16978ETDBNEBTE"
                                }
                            },
                            "netAmountWithoutProductDiscount": 61.55,
                            "vatAmount": 4.0264,
                            "itemId": "6oJITxM",
                            "unit": "หลอด",
                            "vatType": 3,
                            "name": "BRAVO กาวแด๊ป(อะครีลิก) สีขาว #700-2 (25หลอด/กล่อง)"
                        }
                    ],
                    "paidAmount": 0,
                    "remainingWithHoldingTaxAmount": 0
                },
                "orderInfo": {
                    "paymentTerm": "CREDIT",
                    "purchaseOrderNumber": "SPO26031447019148"
                },
                "peakInfo": {
                    "onlineViewLink": "https://secure.peakengine.com/Pdf?emi=MjY4MDE3&eti=OTIwODY4MDE=&eii=Mg==",
                    "documentLink": "https://doc.peakaccount.com/?emi=MjY4MDE3&eti=OTIwODY4MDE=&etti=Mg==&efti=MQ==",
                    "id": "c221b0ba-ac16-4e2e-86f5-7d26eb97a414",
                    "code": "SIV-6903-0113"
                },
                "shippingInfo": {
                    "enablePartial": "FALSE",
                    "type": "COURIER",
                    "location": {
                        "note": "",
                        "phoneNumber": "",
                        "address": {
                            "postCode": "",
                            "address": "919/555 อาคารเซาท์ทาวเวอร์ ชั้น 14 ห้อง 2-6 และ 9 ถนน สีลม แขวง สีลม เขต บางรัก จังหวัด กรุงเทพมหานคร 10500",
                            "province": "",
                            "subdistrict": "",
                            "district": ""
                        },
                        "isPack": True,
                        "courier": "MODERNTOOLS  LAZADA",
                        "geoLocation": None,
                        "name": "-",
                        "alias": "MODERNTOOLS  LAZADA",
                        "id": "Cz2m",
                        "type": "COURIER",
                        "shippingLine": "Marketplace-แพ็ค"
                    }
                },
                "taskInfo": {
                    "refNumbers": [
                        "SO-202603-0172"
                    ],
                    "createBy": "SYSTEM",
                    "refIds": [
                        "01KKNFYNWSHXQEAXFCV77VN342"
                    ],
                    "createdDate": 1773647899747,
                    "isCopied": False,
                    "dueDate": 1773647899747,
                    "gUId": "-",
                    "tags": [
                        "SO-202603-0172"
                    ]
                },
                "customerInfo": {
                    "address": {
                        "address": "919/555 อาคารเซาท์ทาวเวอร์ ชั้น 14 ห้อง 2-6 และ 9 ถนน สีลม แขวง สีลม เขต บางรัก จังหวัด กรุงเทพมหานคร 10500"
                    },
                    "phoneNumber": "0882649236",
                    "code": "C6309-0005",
                    "branchNumber": "00000",
                    "taxId": "0105537143215",
                    "subGroup": "ลูกค้า Marketplace ( OFM)",
                    "grade": "C",
                    "name": " ออฟฟิศเมท (ไทย) ",
                    "branchName": "สำนักงานใหญ่",
                    "category": 2,
                    "group": "G-Pink"
                },
                "contacts": [
                    {
                        "firstName": "เฮีย",
                        "lastName": "",
                        "phoneNumber": "0882649236",
                        "lineProfile": None,
                        "isPrimary": True,
                        "id": "OWNER",
                        "position": "OWNER",
                        "title": "เจ้าของ"
                    }
                ]
            },
            "ref3": "01HZRAE761PM2K7Q1FQB3DDPQQ",
            "ref2": "01KKNFYNWSHXQEAXFCV77VN342",
            "status": "PENDING",
            "group": "",
            "workflowId": "INVOICE",
            "company": "SKi",
            "taskNumber": "SIV-6903-0113",
            "versionId": "01JCJ81REVFQZ1NEAP578HV25C",
            "id": "01KKTTEB33BPHVTP2FANBRMXJV",
            "parentIds": [
                "01JBMEPPTZR17PF0AP1VFVF83Y"
            ],
            "updatedTimestamp": 1773647912867,
            "taskId": "",
            "mid": "SKi",
            "timestamp": 1773647899747,
            "prefix": "SIV",
            "metaStatus": "",
            "ref1": "01JBMEPPTZR17PF0AP1VFVF83Y",
            "type": "TASK",
            "checklists": []
        }
    ]
}

DB_PATH = 'local.db'

def init_db():
    with open('schema.sql', 'r', encoding='utf-8') as f:
        schema = f.read()
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(schema)
    conn.close()

def ingest():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for hit in data['hits']:
        detail = hit['detail']
        order = detail['order']
        cust = detail['customerInfo']
        peak = detail['peakInfo']
        ship = detail['shippingInfo']
        task_info = detail['taskInfo']
        
        # 1. Insert Invoice
        cursor.execute("""
            INSERT OR REPLACE INTO invoices (id, task_number, company, status, timestamp, net_amount, vat_amount, pre_tax_amount, peak_id, peak_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            hit['id'], hit['taskNumber'], hit['company'], hit['status'], hit['timestamp'],
            order['netAmount'], order['vatAmount'], order['preTaxAmount'],
            peak['id'], peak['code']
        ))
        
        # 2. Insert Items
        for item in order['items']:
            cursor.execute("""
                INSERT OR REPLACE INTO invoice_items (id, invoice_id, sku, name, quantity, unit_price, pre_tax_amount, net_amount, vat_amount, unit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item['id'], hit['id'], item['sku'], item['name'], item['quantity'], item['price'],
                item['preTaxAmount'], item['netAmount'], item['vatAmount'], item['unit']
            ))
            
        # 3. Insert Customer
        cursor.execute("""
            INSERT OR REPLACE INTO customers (code, name, tax_id, phone_number, address, sub_group, customer_grade)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            cust['code'], cust['name'], cust['taxId'], cust['phoneNumber'], cust['address']['address'],
            cust['subGroup'], cust['grade']
        ))
        
        # 4. Insert Shipping
        ship_loc = ship['location']
        cursor.execute("""
            INSERT OR REPLACE INTO shipping_info (invoice_id, type, courier, alias, address)
            VALUES (?, ?, ?, ?, ?)
        """, (
            hit['id'], ship['type'], ship_loc['courier'], ship_loc['alias'], ship_loc['address']['address']
        ))
        
    conn.commit()
    conn.close()
    print("Ingestion complete.")

if __name__ == "__main__":
    init_db()
    ingest()
