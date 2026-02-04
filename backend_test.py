#!/usr/bin/env python3
"""
Backend API Testing for Ringtone Feature
Tests all ringtone-related functionality in the Sadaa Instrumentals API
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class RingtoneAPITester:
    def __init__(self, base_url: str = "https://simple-tone-db.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_instrumental_id = None

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")
        print()

    def test_api_connection(self) -> bool:
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{self.base_url}/api/", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.log_test(
                    "API Connection", 
                    True, 
                    f"API is accessible - {data.get('message', 'Unknown')}"
                )
            else:
                self.log_test(
                    "API Connection", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.text
                )
            return success
        except Exception as e:
            self.log_test("API Connection", False, f"Connection error: {str(e)}")
            return False

    def test_ringtone_url_accessibility(self) -> bool:
        """Test if the ringtone URL is accessible"""
        test_url = "https://azjankari.in/audio/song2.mp3"
        try:
            response = requests.head(test_url, timeout=10, allow_redirects=True)
            success = response.status_code == 200
            
            if success:
                content_type = response.headers.get('content-type', 'unknown')
                content_length = response.headers.get('content-length', 'unknown')
                self.log_test(
                    "Ringtone URL Accessibility", 
                    True, 
                    f"URL accessible - Content-Type: {content_type}, Size: {content_length} bytes"
                )
            else:
                self.log_test(
                    "Ringtone URL Accessibility", 
                    False, 
                    f"URL returned status {response.status_code}",
                    response.headers
                )
            return success
        except Exception as e:
            self.log_test("Ringtone URL Accessibility", False, f"URL access error: {str(e)}")
            return False

    def test_get_featured_instrumentals(self) -> bool:
        """Test GET /api/instrumentals/featured for ringtone field"""
        try:
            response = requests.get(f"{self.base_url}/api/instrumentals/featured", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if tracks have ringtone field
                    tracks_with_ringtone = 0
                    total_tracks = len(data)
                    
                    for track in data:
                        if 'ringtone' in track:
                            tracks_with_ringtone += 1
                            # Check if ringtone field has the expected URL
                            if track['ringtone'] == "https://azjankari.in/audio/song2.mp3":
                                pass  # Expected value found
                    
                    self.log_test(
                        "GET Featured Instrumentals - Ringtone Field", 
                        True, 
                        f"Found {total_tracks} featured tracks, {tracks_with_ringtone} have ringtone field",
                        {"total_tracks": total_tracks, "tracks_with_ringtone": tracks_with_ringtone}
                    )
                else:
                    self.log_test(
                        "GET Featured Instrumentals - Ringtone Field", 
                        False, 
                        "No featured tracks found or invalid response format",
                        data
                    )
                    success = False
            else:
                self.log_test(
                    "GET Featured Instrumentals - Ringtone Field", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.text
                )
            return success
        except Exception as e:
            self.log_test("GET Featured Instrumentals - Ringtone Field", False, f"Request error: {str(e)}")
            return False

    def test_get_all_instrumentals(self) -> bool:
        """Test GET /api/instrumentals for ringtone field"""
        try:
            response = requests.get(f"{self.base_url}/api/instrumentals", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if tracks have ringtone field
                    tracks_with_ringtone = 0
                    total_tracks = len(data)
                    
                    for track in data:
                        if 'ringtone' in track:
                            tracks_with_ringtone += 1
                    
                    self.log_test(
                        "GET All Instrumentals - Ringtone Field", 
                        True, 
                        f"Found {total_tracks} total tracks, {tracks_with_ringtone} have ringtone field",
                        {"total_tracks": total_tracks, "tracks_with_ringtone": tracks_with_ringtone}
                    )
                else:
                    self.log_test(
                        "GET All Instrumentals - Ringtone Field", 
                        False, 
                        "No tracks found or invalid response format",
                        data
                    )
                    success = False
            else:
                self.log_test(
                    "GET All Instrumentals - Ringtone Field", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.text
                )
            return success
        except Exception as e:
            self.log_test("GET All Instrumentals - Ringtone Field", False, f"Request error: {str(e)}")
            return False

    def test_create_instrumental_with_ringtone(self) -> bool:
        """Test POST /api/instrumentals with ringtone field"""
        test_data = {
            "title": "Test Ringtone Track",
            "mood": "Calm",
            "duration": 180,
            "duration_formatted": "3:00",
            "is_premium": False,
            "is_featured": False,
            "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            "ringtone": "https://azjankari.in/audio/song2.mp3",
            "thumbnail_color": "#4A3463",
            "file_size": 3200000
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/instrumentals", 
                json=test_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if 'id' in data and 'ringtone' in data:
                    self.created_instrumental_id = data['id']
                    expected_ringtone = test_data['ringtone']
                    actual_ringtone = data['ringtone']
                    
                    if actual_ringtone == expected_ringtone:
                        self.log_test(
                            "POST Instrumental - Create with Ringtone", 
                            True, 
                            f"Successfully created instrumental with ringtone field. ID: {data['id']}",
                            {"created_id": data['id'], "ringtone": data['ringtone']}
                        )
                    else:
                        self.log_test(
                            "POST Instrumental - Create with Ringtone", 
                            False, 
                            f"Ringtone field mismatch. Expected: {expected_ringtone}, Got: {actual_ringtone}",
                            data
                        )
                        success = False
                else:
                    self.log_test(
                        "POST Instrumental - Create with Ringtone", 
                        False, 
                        "Response missing id or ringtone field",
                        data
                    )
                    success = False
            else:
                self.log_test(
                    "POST Instrumental - Create with Ringtone", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.text
                )
            return success
        except Exception as e:
            self.log_test("POST Instrumental - Create with Ringtone", False, f"Request error: {str(e)}")
            return False

    def test_update_instrumental_ringtone(self) -> bool:
        """Test PUT /api/instrumentals/{id} to update ringtone field"""
        if not self.created_instrumental_id:
            self.log_test("PUT Instrumental - Update Ringtone", False, "No instrumental ID available for update test")
            return False
        
        update_data = {
            "ringtone": "https://azjankari.in/audio/updated_ringtone.mp3"
        }
        
        try:
            response = requests.put(
                f"{self.base_url}/api/instrumentals/{self.created_instrumental_id}", 
                json=update_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if 'ringtone' in data:
                    expected_ringtone = update_data['ringtone']
                    actual_ringtone = data['ringtone']
                    
                    if actual_ringtone == expected_ringtone:
                        self.log_test(
                            "PUT Instrumental - Update Ringtone", 
                            True, 
                            f"Successfully updated ringtone field. New value: {data['ringtone']}",
                            {"updated_ringtone": data['ringtone']}
                        )
                    else:
                        self.log_test(
                            "PUT Instrumental - Update Ringtone", 
                            False, 
                            f"Ringtone update failed. Expected: {expected_ringtone}, Got: {actual_ringtone}",
                            data
                        )
                        success = False
                else:
                    self.log_test(
                        "PUT Instrumental - Update Ringtone", 
                        False, 
                        "Response missing ringtone field",
                        data
                    )
                    success = False
            else:
                self.log_test(
                    "PUT Instrumental - Update Ringtone", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.text
                )
            return success
        except Exception as e:
            self.log_test("PUT Instrumental - Update Ringtone", False, f"Request error: {str(e)}")
            return False

    def test_get_specific_instrumental(self) -> bool:
        """Test GET /api/instrumentals/{id} for ringtone field"""
        if not self.created_instrumental_id:
            self.log_test("GET Specific Instrumental - Ringtone Field", False, "No instrumental ID available for get test")
            return False
        
        try:
            response = requests.get(f"{self.base_url}/api/instrumentals/{self.created_instrumental_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if 'ringtone' in data:
                    self.log_test(
                        "GET Specific Instrumental - Ringtone Field", 
                        True, 
                        f"Successfully retrieved instrumental with ringtone: {data['ringtone']}",
                        {"id": data['id'], "ringtone": data['ringtone']}
                    )
                else:
                    self.log_test(
                        "GET Specific Instrumental - Ringtone Field", 
                        False, 
                        "Response missing ringtone field",
                        data
                    )
                    success = False
            else:
                self.log_test(
                    "GET Specific Instrumental - Ringtone Field", 
                    False, 
                    f"API returned status {response.status_code}",
                    response.text
                )
            return success
        except Exception as e:
            self.log_test("GET Specific Instrumental - Ringtone Field", False, f"Request error: {str(e)}")
            return False

    def cleanup_test_data(self) -> bool:
        """Clean up test data by deleting created instrumental"""
        if not self.created_instrumental_id:
            return True
        
        try:
            response = requests.delete(f"{self.base_url}/api/instrumentals/{self.created_instrumental_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                self.log_test(
                    "Cleanup - Delete Test Instrumental", 
                    True, 
                    f"Successfully deleted test instrumental {self.created_instrumental_id}"
                )
            else:
                self.log_test(
                    "Cleanup - Delete Test Instrumental", 
                    False, 
                    f"Failed to delete test instrumental. Status: {response.status_code}",
                    response.text
                )
            return success
        except Exception as e:
            self.log_test("Cleanup - Delete Test Instrumental", False, f"Cleanup error: {str(e)}")
            return False

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all ringtone-related tests"""
        print("🎵 Starting Ringtone Feature Backend API Tests")
        print("=" * 60)
        print()
        
        # Test 1: Basic API connectivity
        if not self.test_api_connection():
            print("❌ API connection failed. Stopping tests.")
            return self.get_summary()
        
        # Test 2: Ringtone URL accessibility
        self.test_ringtone_url_accessibility()
        
        # Test 3: GET featured instrumentals with ringtone field
        self.test_get_featured_instrumentals()
        
        # Test 4: GET all instrumentals with ringtone field
        self.test_get_all_instrumentals()
        
        # Test 5: POST instrumental with ringtone field
        self.test_create_instrumental_with_ringtone()
        
        # Test 6: GET specific instrumental with ringtone field
        self.test_get_specific_instrumental()
        
        # Test 7: PUT update instrumental ringtone field
        self.test_update_instrumental_ringtone()
        
        # Test 8: Cleanup
        self.cleanup_test_data()
        
        return self.get_summary()

    def get_summary(self) -> Dict[str, Any]:
        """Get test summary"""
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        summary = {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": round(success_rate, 2),
            "test_results": self.test_results,
            "timestamp": datetime.now().isoformat()
        }
        
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Ringtone feature is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the details above.")
        
        return summary

def main():
    """Main test execution"""
    tester = RingtoneAPITester()
    summary = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if summary["failed_tests"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
        
        # Test 2: Verify premium tracks have preview fields populated
        premium_with_preview = 0
        premium_without_preview = 0
        
        for track in premium_tracks:
            preview_start = track.get('preview_start')
            preview_end = track.get('preview_end')
            
            if preview_start is not None and preview_end is not None:
                premium_with_preview += 1
                
                # Test 4: Verify preview time range makes sense
                if preview_start >= preview_end:
                    results.add_fail("Preview Time Range", 
                                   f"Track '{track['title']}': preview_start ({preview_start}) >= preview_end ({preview_end})")
                else:
                    duration = preview_end - preview_start
                    if duration < 10 or duration > 60:
                        results.add_fail("Preview Duration", 
                                       f"Track '{track['title']}': preview duration {duration}s is not reasonable (should be 10-60s)")
                    else:
                        # This is a good preview range
                        pass
            else:
                premium_without_preview += 1
        
        if premium_with_preview > 0:
            results.add_pass("Premium Tracks Have Preview Fields")
        else:
            results.add_fail("Premium Tracks Have Preview Fields", 
                           f"No premium tracks have preview fields set")
        
        # Test 3: Verify free tracks have preview fields as null
        free_with_preview = 0
        for track in free_tracks:
            preview_start = track.get('preview_start')
            preview_end = track.get('preview_end')
            
            if preview_start is not None or preview_end is not None:
                free_with_preview += 1
        
        if free_with_preview == 0:
            results.add_pass("Free Tracks Have No Preview Fields")
        else:
            results.add_fail("Free Tracks Have No Preview Fields", 
                           f"{free_with_preview} free tracks have preview fields set")
        
        print(f"📊 Premium tracks with preview: {premium_with_preview}/{len(premium_tracks)}")
        print(f"📊 Free tracks with preview: {free_with_preview}/{len(free_tracks)}")
        
    except Exception as e:
        results.add_fail("Get All Instrumentals", f"Exception: {str(e)}")
        return results
    
    # Test 5: GET /api/instrumentals?is_premium=true
    try:
        response = requests.get(f"{BACKEND_URL}/instrumentals?is_premium=true", timeout=10)
        if response.status_code != 200:
            results.add_fail("Get Premium Only", f"Status code: {response.status_code}")
        else:
            premium_only = response.json()
            
            # Verify all returned tracks are premium
            non_premium_count = 0
            tracks_with_preview = 0
            
            for track in premium_only:
                if not track.get('is_premium', False):
                    non_premium_count += 1
                
                if track.get('preview_start') is not None and track.get('preview_end') is not None:
                    tracks_with_preview += 1
            
            if non_premium_count == 0:
                results.add_pass("Premium Filter Returns Only Premium")
            else:
                results.add_fail("Premium Filter Returns Only Premium", 
                               f"{non_premium_count} non-premium tracks returned")
            
            if tracks_with_preview > 0:
                results.add_pass("Premium Tracks Have Preview Times")
                print(f"📊 Premium tracks with preview times: {tracks_with_preview}/{len(premium_only)}")
            else:
                results.add_fail("Premium Tracks Have Preview Times", 
                               "No premium tracks have preview times set")
                
    except Exception as e:
        results.add_fail("Get Premium Only", f"Exception: {str(e)}")
    
    return results

def test_preview_time_validation():
    """Test specific preview time validation scenarios"""
    results = TestResults()
    
    try:
        # Get a few premium tracks to analyze their preview times
        response = requests.get(f"{BACKEND_URL}/instrumentals?is_premium=true", timeout=10)
        if response.status_code != 200:
            results.add_fail("Preview Time Validation", "Could not fetch premium tracks")
            return results
            
        premium_tracks = response.json()
        
        valid_previews = 0
        invalid_previews = 0
        
        for track in premium_tracks[:5]:  # Test first 5 premium tracks
            preview_start = track.get('preview_start')
            preview_end = track.get('preview_end')
            track_duration = track.get('duration', 0)
            
            if preview_start is not None and preview_end is not None:
                # Check if preview times are within track duration
                if preview_start < 0 or preview_end > track_duration:
                    results.add_fail("Preview Within Track Duration", 
                                   f"Track '{track['title']}': preview times outside track duration")
                    invalid_previews += 1
                elif preview_start >= preview_end:
                    results.add_fail("Preview Start Before End", 
                                   f"Track '{track['title']}': preview_start >= preview_end")
                    invalid_previews += 1
                else:
                    valid_previews += 1
                    duration = preview_end - preview_start
                    print(f"✅ Track '{track['title']}': {duration}s preview ({preview_start}-{preview_end})")
        
        if valid_previews > 0 and invalid_previews == 0:
            results.add_pass("Preview Time Validation")
        elif invalid_previews > 0:
            results.add_fail("Preview Time Validation", f"{invalid_previews} tracks have invalid preview times")
        else:
            results.add_fail("Preview Time Validation", "No preview times found to validate")
            
    except Exception as e:
        results.add_fail("Preview Time Validation", f"Exception: {str(e)}")
    
    return results

def main():
    """Run all preview feature tests"""
    print("🎵 Sadaa Instrumentals API - Preview Feature Tests")
    print("="*60)
    
    # Test API connection first
    print("\n1. Testing API Connection...")
    connection_results = test_api_connection()
    if connection_results.failed > 0:
        print("❌ Cannot proceed - API connection failed")
        return False
    
    # Seed database
    print("\n2. Seeding Database...")
    if not seed_database():
        print("❌ Cannot proceed - database seeding failed")
        return False
    
    # Test preview feature
    print("\n3. Testing Preview Feature...")
    preview_results = test_preview_feature()
    
    # Test preview time validation
    print("\n4. Testing Preview Time Validation...")
    validation_results = test_preview_time_validation()
    
    # Combined results
    total_passed = connection_results.passed + preview_results.passed + validation_results.passed
    total_failed = connection_results.failed + preview_results.failed + validation_results.failed
    all_errors = connection_results.errors + preview_results.errors + validation_results.errors
    
    print(f"\n{'='*60}")
    print(f"🎵 PREVIEW FEATURE TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Total Tests: {total_passed + total_failed}")
    print(f"Passed: {total_passed}")
    print(f"Failed: {total_failed}")
    
    if all_errors:
        print(f"\n❌ FAILED TESTS:")
        for error in all_errors:
            print(f"  - {error}")
    
    if total_failed == 0:
        print(f"\n✅ ALL PREVIEW FEATURE TESTS PASSED!")
        return True
    else:
        print(f"\n❌ {total_failed} TESTS FAILED")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)